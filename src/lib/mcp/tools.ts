// MCP tools for the site's token-protected API: résumés, content sections,
// photos and blog posts. Shared by the stdio server in mcp/ and the remote server
// at src/app/mcp (through src/lib/mcp/remote.ts), so relative imports and
// packages only (no "@/", next/* or server-only), and it must type-check
// under both the root and mcp/ tsconfigs. The
// package.json next to this file marks it as an ES module for node.
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { fetchImageFromUrl } from "./safe-fetch.ts";

export type Call = (
  route: string,
  init?: RequestInit & { timeoutMs?: number },
) => Promise<Response>;

export type ToolOptions = {
  call: Call;
  // "file" writes preview PDFs to a temp file (local server); "embed"
  // returns them inline as a resource.
  pdf: "file" | "embed";
  // Whether upload_image may read a local file (the stdio server only; the
  // remote one must never read the server's filesystem).
  localFiles: boolean;
};

// Thrown by call() for problems worth showing as-is (no token, network).
export class ApiError extends Error {}

const MAX_EMBED_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
// From src/lib/media/limits.ts (not imported: that folder isn't marked as
// an ES module for node). The proxy in front of the site refuses bodies over
// about 1 MB, so bigger photos are shrunk to UPLOAD_TARGET_BYTES first.
const MAX_EDGE = 2000;
const MAX_INPUT_PIXELS = 50_000_000;
const UPLOAD_TARGET_BYTES = 900 * 1024;

const type = z
  .enum(["accounting", "auditing", "finance", "tech", "general"])
  .describe("Résumé type");

const section = z
  .enum(["site", "home", "about", "projects", "socials"])
  .describe("Content section");

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(80)
  .describe("Post slug (URL /blog/<slug>), lowercase words joined by hyphens");

const note = z.string().max(500).describe("Short description of the change");

const SECTION_GUIDE = `Sections and their shapes (objects are strict: unknown keys are rejected; any item with hidden: true is kept but not shown):
- site: { tagline, now? ("" hides it), about: string[] (paragraphs), focus: string[] (home facts after the location), email (must be one of emails[].address), emails: [{ label, address, hidden? }], links: [{ label, href, hidden? }], location, footerLines: string[], avatar? ("/media/<sha256>.webp" from upload_image, or "/file.jpg" in public/) }. The name and description are fixed in code.
- home: { projects: slug[] (featured projects, in order; drafts and hidden are skipped), experience: { mode: "all" | "picked", picks: ["Role|Start" keys from the general résumé, e.g. "Internal Events Director|May 2026"] }, balance: { accounting: string[], building: [{ label, href?, hidden? }] } } (the home T-account).
- about: { competitions: [{ name, role?, result?, start?, end?, href?, hidden? }], clubs: [{ name, role?, start?, end?, href?, hidden? }], hobbies: [{ name, blurb, image?: { src, alt, width?, height? }, hidden? }], testimonials: [{ quote, name, role, org, hidden? }] }. Dates are plain text like "Nov 2026". Testimonials must not contain emails, phone numbers or LinkedIn URLs.
- projects: { projects: [{ slug, title, summary, description, category: "accounting" | "tech" | "other", tags: string[], links: [{ kind: "live" | "github", href }], draft: boolean (drafts are not shown publicly), hidden?, images?: [{ src, alt, width?, height? }] }] }. Slugs are unique, lowercase words joined by hyphens.
- socials: { rows: [{ label, href, icon: "globe" | "document" | "linkedin" | "github" | "mail" | "shuttlecock" | "folder", quick? (also a small icon under the name), copy? (text with a copy button), hidden? } or { include: "emails" } (one row per site email)] } (the /socials page, top to bottom).
Every href is "/..." (on site) or "https://...". Image src is "/media/<sha256>.webp" (from upload_image) or "/hobbies/<file>"; alt is required; copy width and height from upload_image. Never put the private phone number or address in any section.`;

const POST_GUIDE =
  "A post is { title (<=200 chars), date (YYYY-MM-DD), summary (<=500 chars, shown on /blog), body (markdown; raw HTML is shown as text), draft? (drafts are not shown publicly) }.";

function text(value: unknown): CallToolResult {
  return {
    content: [
      { type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) },
    ],
  };
}

function failure(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

async function httpError(res: Response): Promise<CallToolResult> {
  const body = await res.text();
  let data: {
    error?: string;
    message?: string;
    reason?: string;
    variant?: string;
    logTail?: string;
    issues?: { path: string; message: string }[];
    currentVersion?: number | null;
  } = {};
  try {
    data = JSON.parse(body);
  } catch {}
  const lines = [`HTTP ${res.status}: ${data.error ?? body.slice(0, 500)}`];
  if (data.message) lines.push(data.message);
  for (const issue of data.issues ?? []) {
    lines.push(`- ${issue.path || "(root)"}: ${issue.message}`);
  }
  if (data.currentVersion !== undefined) {
    lines.push(`current version is now ${data.currentVersion ?? "none"}; get it again and redo the change`);
  }
  if (data.variant || data.reason) {
    lines.push(`variant: ${data.variant ?? "public"}, reason: ${data.reason ?? "unknown"}`);
  }
  if (data.logTail) lines.push("", "Log tail:", data.logTail);
  return failure(lines.join("\n"));
}

// The same magic bytes the site checks: JPEG, PNG, WebP, and HEIF (which
// the site answers with its own message). Duplicated because this file
// can't import from "@/".
function looksLikeImage(b: Uint8Array): boolean {
  const ascii = (start: number, end: number) => String.fromCharCode(...b.subarray(start, end));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 8 && png.every((v, i) => b[i] === v)) return true;
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return true;
  const heif = ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "avif"];
  return b.length >= 12 && ascii(4, 8) === "ftyp" && heif.includes(ascii(8, 12));
}

// A JPEG with the long edge at most MAX_EDGE and at most UPLOAD_TARGET_BYTES,
// or the bytes as they are when they already fit or sharp can't read them
// (the site then answers with its own message).
async function shrinkImage(bytes: Uint8Array): Promise<Uint8Array> {
  const sharp = (await import("sharp")).default;
  try {
    const meta = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    const long = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (bytes.byteLength <= UPLOAD_TARGET_BYTES && long <= MAX_EDGE) return bytes;
    let edge = Math.min(MAX_EDGE, long);
    for (let step = 0; step < 12; step++) {
      for (const quality of step === 0 ? [86, 78, 70, 60] : [60]) {
        const out = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS })
          .rotate()
          .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality })
          .toBuffer();
        if (out.byteLength <= UPLOAD_TARGET_BYTES) return new Uint8Array(out);
      }
      edge = Math.max(1, Math.round(edge * 0.8));
    }
  } catch {}
  return bytes;
}

async function guarded(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return failure(e.message);
    console.error(`resume-mcp: ${(e as Error).message}`);
    return failure(`unexpected error: ${(e as Error).message}`);
  }
}

export function registerTools(server: McpServer, { call, pdf, localFiles }: ToolOptions): void {
  async function getJson(route: string): Promise<CallToolResult> {
    const res = await call(route);
    if (!res.ok) return httpError(res);
    return text(await res.json());
  }

  async function send(
    route: string,
    method: string,
    body: unknown,
    okStatus: number,
    timeoutMs?: number,
  ): Promise<CallToolResult> {
    const res = await call(route, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs,
    });
    if (res.status !== okStatus) return httpError(res);
    return text(await res.json());
  }

  // ---- Résumés ----

  server.registerTool(
    "list_resumes",
    {
      description:
        "List every résumé type with its current version number, note, date and whether a public PDF exists.",
      inputSchema: {},
    },
    () => guarded(() => getJson("/api/resume")),
  );

  server.registerTool(
    "list_versions",
    {
      description:
        "List the version history (metadata only) for one résumé type, newest first. Imported PDFs appear as source 'import' and cannot be restored.",
      inputSchema: { type },
    },
    ({ type }) => guarded(() => getJson(`/api/resume/${type}`)),
  );

  server.registerTool(
    "get_resume",
    {
      description:
        "Get the .tex source of a résumé version (the current one by default). Phone and address appear only as \\resumephone and \\resumeaddress.",
      inputSchema: {
        type,
        version: z.number().int().positive().optional().describe("Version number; omit for current"),
      },
    },
    ({ type, version }) =>
      guarded(async () => {
        const res = await call(`/api/resume/${type}/versions/${version ?? "current"}`);
        if (!res.ok) return httpError(res);
        const { meta, tex } = (await res.json()) as { meta: unknown; tex: string | null };
        return {
          content: [
            { type: "text", text: JSON.stringify(meta, null, 2) },
            { type: "text", text: tex ?? "(this version has no tex; it is an imported PDF)" },
          ],
        };
      }),
  );

  server.registerTool(
    "preview_resume",
    {
      description:
        pdf === "file"
          ? "Compile .tex to the public PDF without saving anything. Returns the page count and, by default, a local path to the PDF so it can be opened."
          : "Compile .tex to the public PDF without saving anything. Returns the page count and the PDF itself.",
      inputSchema: {
        type,
        tex: z.string().min(1).describe("Full .tex source"),
        save_pdf: z
          .boolean()
          .default(true)
          .describe(pdf === "file" ? "Write the PDF to a temp file" : "Include the PDF in the result"),
      },
    },
    ({ type, tex, save_pdf }) =>
      guarded(async () => {
        const res = await call(`/api/resume/${type}/preview`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tex }),
          timeoutMs: 90_000,
        });
        if (!res.ok) return httpError(res);
        const bytes = new Uint8Array(await res.arrayBuffer());
        const pages = res.headers.get("x-resume-pages");
        const result: {
          ok: true;
          pages: number | null;
          bytes: number;
          path?: string;
          note?: string;
        } = {
          ok: true,
          pages: pages ? Number(pages) : null,
          bytes: bytes.byteLength,
        };
        if (save_pdf && pdf === "file") {
          result.path = path.join(os.tmpdir(), `resume-preview-${type}-${randomUUID()}.pdf`);
          await fs.writeFile(result.path, bytes);
        }
        const tooBig = save_pdf && pdf === "embed" && bytes.byteLength > MAX_EMBED_BYTES;
        if (tooBig) result.note = "PDF too large to include";
        const summary = text(result);
        if (save_pdf && pdf === "embed" && !tooBig) {
          summary.content.push({
            type: "resource",
            resource: {
              uri: `resume-preview://${type}.pdf`,
              mimeType: "application/pdf",
              blob: Buffer.from(bytes).toString("base64"),
            },
          });
        }
        return summary;
      }),
  );

  server.registerTool(
    "update_resume",
    {
      description:
        "Save .tex as the new current version. Compiles the public and private PDFs first; if either fails nothing is saved and the log tail is returned. Never put the phone number or address in the tex; use \\resumephone and \\resumeaddress.",
      inputSchema: {
        type,
        tex: z.string().min(1).describe("Full .tex source"),
        note,
      },
    },
    ({ type, tex, note }) =>
      guarded(() => send(`/api/resume/${type}`, "POST", { tex, note }, 201, 150_000)),
  );

  server.registerTool(
    "restore_version",
    {
      description:
        "Make an earlier tex version current again by copying it into a new version. History is never rewritten.",
      inputSchema: {
        type,
        version: z.number().int().positive().describe("Version number to restore"),
      },
    },
    ({ type, version }) =>
      guarded(() => send(`/api/resume/${type}/restore`, "POST", { version }, 201, 150_000)),
  );

  server.registerTool(
    "regenerate_resume",
    {
      description:
        "Recompile the current version's public and private PDFs in place, without a new version (e.g. after the phone number or address changes on the server).",
      inputSchema: { type },
    },
    ({ type }) =>
      guarded(() => send(`/api/resume/${type}/regenerate`, "POST", {}, 200, 150_000)),
  );

  // ---- Content sections ----

  server.registerTool(
    "list_content",
    {
      description: `List the site's content sections with their current version, note and date.\n\n${SECTION_GUIDE}`,
      inputSchema: {},
    },
    () => guarded(() => getJson("/api/content")),
  );

  server.registerTool(
    "get_content",
    {
      description:
        "Get a content section's data (the current version by default) with its version metadata. Do this before update_content.",
      inputSchema: {
        section,
        version: z.number().int().positive().optional().describe("Version number; omit for current"),
      },
    },
    ({ section, version }) =>
      guarded(() => getJson(`/api/content/${section}/versions/${version ?? "current"}`)),
  );

  server.registerTool(
    "list_content_versions",
    {
      description: "List the version history (metadata only) for one content section, newest first.",
      inputSchema: { section },
    },
    ({ section }) => guarded(() => getJson(`/api/content/${section}`)),
  );

  server.registerTool(
    "update_content",
    {
      description: `Save a whole content section as its new current version; the live site updates at once. Call get_content first, change what's needed, and send the entire section back (not just the changed part). Pass base_version (meta.versionNo from get_content) so a save made elsewhere in between is refused instead of overwritten. Validation errors list each bad path.\n\n${SECTION_GUIDE}`,
      inputSchema: {
        section,
        data: z.record(z.string(), z.unknown()).describe("The whole section object"),
        note,
        base_version: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("The version the edit started from"),
      },
    },
    ({ section, data, note, base_version }) =>
      guarded(() =>
        send(`/api/content/${section}`, "POST", { data, note, baseVersion: base_version }, 201),
      ),
  );

  server.registerTool(
    "restore_content",
    {
      description:
        "Make an earlier version of a content section current again by copying it into a new version. It must still pass the current validation.",
      inputSchema: {
        section,
        version: z.number().int().positive().describe("Version number to restore"),
        note: note.optional(),
      },
    },
    ({ section, version, note }) =>
      guarded(() => send(`/api/content/${section}/restore`, "POST", { version, note }, 201)),
  );

  server.registerTool(
    "reset_content_to_seed",
    {
      description:
        "Replace a content section with the repo seed (src/content/*.ts) as a new version. Use after changing a seed file in code; history is kept.",
      inputSchema: { section, note: note.optional() },
    },
    ({ section, note }) =>
      guarded(() => send(`/api/content/${section}/reset`, "POST", { note }, 201)),
  );

  server.registerTool(
    "upload_image",
    {
      description:
        "Upload a photo to the site and get back its src, width and height. Give exactly one of path, data_base64 or url. For a photo the user has on their phone or computer (or attached in the chat), use create_upload_link instead when path isn't available: attached photos can't be passed to this tool. url is for public images. Then set it with get_content + update_content: site.avatar = src (a string); or push { src, alt, width, height } onto projects.projects[i].images; or set about.hobbies[i].image = { src, alt, width, height }. alt is required: a short description of the photo. The photo is resized to at most 2000px, converted to WebP, and all metadata (including location) is removed. With path or url, photos are shrunk automatically to fit the upload limit. " +
        (localFiles
          ? "path is a local file on this computer (JPEG, PNG or WebP, up to 15 MB)."
          : "path doesn't work here. For a photo on the user's device, use create_upload_link; otherwise a public https url, or data_base64 for small images (under about 700 KB)."),
      inputSchema: {
        path: z
          .string()
          .optional()
          .describe(localFiles ? "A local image file" : "Not available on this server"),
        data_base64: z
          .string()
          .max(21_000_000)
          .optional()
          .describe("The image itself, base64-encoded (a data: URL prefix is fine)"),
        url: z.string().url().optional().describe("A public https URL of the image"),
      },
    },
    ({ path: file, data_base64, url }) =>
      guarded(async () => {
        const given = [file, data_base64, url].filter((v) => v !== undefined);
        if (given.length !== 1) return failure("Give exactly one of path, data_base64 or url.");

        let bytes: Uint8Array;
        if (file !== undefined) {
          if (!localFiles) return failure("path only works with the local MCP server.");
          let stat;
          try {
            stat = await fs.stat(file);
          } catch {
            return failure("That file couldn't be found.");
          }
          if (!stat.isFile()) return failure("That path isn't a file.");
          if (stat.size > MAX_IMAGE_BYTES) return failure("That image is over 15 MB.");
          bytes = await fs.readFile(file);
        } else if (data_base64 !== undefined) {
          bytes = Buffer.from(data_base64.replace(/^data:[^,]*;base64,/, ""), "base64");
          if (bytes.byteLength > MAX_IMAGE_BYTES) return failure("That image is over 15 MB.");
        } else {
          try {
            bytes = await fetchImageFromUrl(url as string, MAX_IMAGE_BYTES);
          } catch (e) {
            return failure((e as Error).message);
          }
        }
        if (!looksLikeImage(bytes)) return failure("That isn't a JPEG, PNG or WebP image.");
        if (data_base64 === undefined) bytes = await shrinkImage(bytes);

        const body = new FormData();
        body.append("file", new Blob([new Uint8Array(bytes)]), "photo");
        const res = await call("/api/media", { method: "POST", body, timeoutMs: 90_000 });
        if (res.status !== 201) return httpError(res);
        return text({
          ...((await res.json()) as object),
          next: "Now set it with get_content + update_content (see the description).",
        });
      }),
  );

  server.registerTool(
    "list_images",
    {
      description:
        "List the photos already uploaded to the site, newest first: src, width, height, created_at (UTC) and used_on (where the current content shows it; empty if unused). Reuse one by setting its src, width and height with update_content (see upload_image).",
      inputSchema: {},
    },
    () => guarded(() => getJson("/api/media/list")),
  );

  server.registerTool(
    "create_upload_link",
    {
      description:
        "Make a one-time link the user opens to send a photo from their own phone or computer (no sign-in). Use this for photos on the user's device, including ones attached in the chat, which can't be passed to upload_image. Give the user the url and ask them to open it and choose the photo. Then call get_upload_link with the id; if it says waiting, wait a little and call it again a few times. When it says done, set the photo with get_content + update_content using its src, width and height, as for upload_image. The link works once and expires after 15 minutes.",
      inputSchema: {
        note: z
          .string()
          .max(200)
          .optional()
          .describe("Shown on the page, e.g. 'a photo for your badminton hobby'"),
      },
    },
    ({ note }) => guarded(() => send("/api/media/links", "POST", { note }, 201)),
  );

  server.registerTool(
    "get_upload_link",
    {
      description:
        "Check a link from create_upload_link: status is waiting (not sent yet), done (with src, width and height) or expired.",
      inputSchema: { id: z.string().uuid().describe("The id from create_upload_link") },
    },
    ({ id }) => guarded(() => getJson(`/api/media/links/${id}`)),
  );

  // ---- Blog posts ----

  const postFields = {
    title: z.string().min(1).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD"),
    summary: z.string().min(1).max(500).describe("One line shown on /blog"),
    body: z.string().describe("Markdown"),
    draft: z.boolean().optional().describe("true hides the post from visitors"),
  };

  server.registerTool(
    "list_posts",
    {
      description:
        "List blog posts (drafts included) with version and date, newest first. deleted lists slugs that can be brought back with restore_post.",
      inputSchema: {},
    },
    () => guarded(() => getJson("/api/posts")),
  );

  server.registerTool(
    "get_post",
    {
      description: `Get a blog post (the current version by default) with its version metadata. ${POST_GUIDE}`,
      inputSchema: {
        slug,
        version: z.number().int().positive().optional().describe("Version number; omit for current"),
      },
    },
    ({ slug, version }) =>
      guarded(() => getJson(`/api/posts/${slug}/versions/${version ?? "current"}`)),
  );

  server.registerTool(
    "create_post",
    {
      description: `Publish a new blog post at /blog/<slug> (or save it as a draft). ${POST_GUIDE}`,
      inputSchema: { slug, ...postFields, note: note.optional() },
    },
    ({ slug, note, ...data }) =>
      guarded(() => send("/api/posts", "POST", { slug, data, note }, 201)),
  );

  server.registerTool(
    "update_post",
    {
      description: `Save a new version of a blog post. Send every field (get_post first); base_version refuses the save if it changed elsewhere. ${POST_GUIDE}`,
      inputSchema: {
        slug,
        ...postFields,
        note,
        base_version: z.number().int().positive().optional().describe("The version the edit started from"),
      },
    },
    ({ slug, note, base_version, ...data }) =>
      guarded(() =>
        send(`/api/posts/${slug}`, "PUT", { data, note, baseVersion: base_version }, 201),
      ),
  );

  server.registerTool(
    "delete_post",
    {
      description: "Take a blog post down. Its history is kept, so restore_post can bring it back.",
      inputSchema: { slug },
    },
    ({ slug }) =>
      guarded(async () => {
        const res = await call(`/api/posts/${slug}`, { method: "DELETE" });
        if (!res.ok) return httpError(res);
        return text(await res.json());
      }),
  );

  server.registerTool(
    "list_post_versions",
    {
      description: "List the version history of a blog post (deleted posts included), newest first.",
      inputSchema: { slug },
    },
    ({ slug }) =>
      guarded(async () => {
        const res = await call(`/api/posts/${slug}`);
        if (!res.ok) return httpError(res);
        const { versions } = (await res.json()) as { versions: unknown };
        return text({ slug, versions });
      }),
  );

  server.registerTool(
    "restore_post",
    {
      description:
        "Make an earlier version of a blog post current again (also undoes delete_post) by copying it into a new version.",
      inputSchema: {
        slug,
        version: z.number().int().positive().describe("Version number to restore"),
        note: note.optional(),
      },
    },
    ({ slug, version, note }) =>
      guarded(() => send(`/api/posts/${slug}/restore`, "POST", { version, note }, 201)),
  );
}
