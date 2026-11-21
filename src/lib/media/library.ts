import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { loadPosts, loadSection } from "@/lib/admin/data";
import { getWriteContentDb } from "@/lib/content-data";
import { deleteMediaRow, insertMedia, listMediaRows, mediaInHistory } from "@/lib/content-store/media";
import { MAX_INPUT_PIXELS, MAX_UPLOAD_BYTES, MEDIA_FILE_RE } from "@/lib/media/limits";
import { processImage } from "@/lib/media/process";
import { mediaDir, mediaFilePath, saveMediaFile } from "@/lib/media/store";
import { COOKIE_NAME, sameSecret, sessionForToken } from "@/lib/owner-session";
import { authorize, json, readBodyLimited } from "@/lib/resume-api";
import { siteOrigin } from "@/lib/site-url";

// Shared by the upload routes (/api/media and /api/upload/<token>), the
// library list and the admin Photos page. Nothing about a photo's contents
// is logged.

const MAX_ACTIVE = 2;
const MAX_BODY = MAX_UPLOAD_BYTES + 256 * 1024;

// One count for every upload route, however the server bundles them.
const uploads = ((globalThis as { __mediaUploads?: { active: number } }).__mediaUploads ??= {
  active: 0,
});

export type Photo = { src: string; width: number; height: number };

export type LibraryPhoto = Photo & {
  file: string;
  created_at: string;
  used_on: string[];
  in_history: boolean;
};

// The API token, or the owner session plus the csrf header plus a
// same-site Origin. A token request never falls back to the cookie.
// Browsers leave Origin off same-origin GETs, so a read may go without it
// when Sec-Fetch-Site says same-origin.
export function checkMediaAuth(req: NextRequest, opts: { read?: boolean } = {}): Response | null {
  if (req.headers.has("authorization")) return authorize(req);

  const session = sessionForToken(req.cookies.get(COOKIE_NAME)?.value);
  if (!session) return json({ error: "unauthorized" }, 401);

  const csrf = req.headers.get("x-csrf-token");
  if (!csrf || !sameSecret(csrf, session.csrf)) return json({ error: "bad_csrf" }, 403);

  const site = req.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return json({ error: "bad_origin" }, 403);

  const rawOrigin = req.headers.get("origin");
  if (rawOrigin === null && opts.read && site === "same-origin") return null;
  let origin: URL;
  try {
    origin = new URL(rawOrigin ?? "");
  } catch {
    return json({ error: "bad_origin" }, 403);
  }
  const requestHost = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0]
    .trim();
  if (origin.host !== new URL(siteOrigin()).host && origin.host !== requestHost) {
    return json({ error: "bad_origin" }, 403);
  }
  return null;
}

function tooLarge() {
  return json({ error: "too_large", maxBytes: MAX_UPLOAD_BYTES }, 413);
}

// Reads a multipart upload, re-encodes it and saves it to the library.
// Returns the photo, or the error response to send.
export async function receiveUpload(req: NextRequest): Promise<Photo | Response> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "multipart_required" }, 415);
  }
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY) return tooLarge();

  if (uploads.active >= MAX_ACTIVE) {
    return Response.json(
      { error: "busy" },
      { status: 503, headers: { "cache-control": "no-store", "retry-after": "5" } },
    );
  }
  uploads.active++;
  try {
    const body = await readBodyLimited(req, MAX_BODY);
    if (body instanceof Response) return tooLarge();

    let form: FormData;
    try {
      form = await new Response(body as BodyInit, {
        headers: { "content-type": contentType },
      }).formData();
    } catch {
      return json({ error: "bad_form" }, 400);
    }

    const file = form.get("file");
    if (!(file instanceof Blob)) return json({ error: "file_required" }, 400);
    if (file.size > MAX_UPLOAD_BYTES) return tooLarge();

    const result = await processImage(new Uint8Array(await file.arrayBuffer()));
    if (!result.ok) return json({ error: result.error, message: result.message }, result.status);

    const saved = await saveMediaFile(result.data, "webp");
    insertMedia(getWriteContentDb(), {
      file: saved.file,
      width: result.width,
      height: result.height,
      bytes: result.data.byteLength,
    });
    return { src: saved.src, width: result.width, height: result.height };
  } finally {
    uploads.active--;
  }
}

// Files in the media folder that have no row yet (uploaded before the
// library existed, or copied in by hand) get one.
async function backfill(known: Set<string>): Promise<void> {
  let names: string[];
  try {
    names = await fs.readdir(mediaDir());
  } catch {
    return;
  }
  const missing = names.filter((name) => MEDIA_FILE_RE.test(name) && !known.has(name));
  if (missing.length === 0) return;
  // Loaded here, so `next build` never loads the native module.
  const sharp = (await import("sharp")).default;
  const db = getWriteContentDb();
  for (const name of missing) {
    const file = path.join(/*turbopackIgnore: true*/ mediaDir(), name);
    try {
      const stat = await fs.stat(file);
      if (!stat.isFile()) continue;
      const meta = await sharp(file, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
      if (!meta.width || !meta.height) continue;
      insertMedia(db, {
        file: name,
        width: meta.width,
        height: meta.height,
        bytes: stat.size,
        mtimeSeconds: stat.mtimeMs / 1000,
      });
    } catch (e) {
      console.error(`media backfill: ${(e as Error).message}`);
    }
  }
}

// Where each library file appears in the current content, in words.
function usage(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (src: string | undefined, label: string) => {
    if (!src?.startsWith("/media/")) return;
    const file = src.slice("/media/".length);
    out.set(file, [...(out.get(file) ?? []), label]);
  };
  add(loadSection("site").data.avatar, "Profile photo");
  for (const project of loadSection("projects").data.projects) {
    for (const image of project.images ?? []) add(image.src, `Project: ${project.title}`);
  }
  for (const hobby of loadSection("about").data.hobbies) {
    add(hobby.image?.src, `Hobby: ${hobby.name}`);
  }
  for (const post of loadPosts()) {
    const files = post.data.body.match(/\/media\/[a-f0-9]{64}\.(?:webp|jpg)/g) ?? [];
    for (const src of new Set(files)) add(src, `Blog post: ${post.data.title}`);
  }
  return out;
}

export async function listLibrary(): Promise<LibraryPhoto[]> {
  const db = getWriteContentDb();
  await backfill(new Set(listMediaRows(db).map((row) => row.file)));
  const used = usage();
  return listMediaRows(db).map((row) => ({
    src: "/media/" + row.file,
    file: row.file,
    width: row.width ?? 0,
    height: row.height ?? 0,
    created_at: row.created_at,
    used_on: [...new Set(used.get(row.file) ?? [])],
    in_history: mediaInHistory(db, row.file),
  }));
}

export type DeleteResult = "deleted" | "in_use" | "not_found";

// Only for photos nothing uses now and no saved version mentions. The
// check runs again here, whatever the page showed.
export async function deletePhoto(file: string): Promise<DeleteResult> {
  const target = mediaFilePath(file);
  if (!target) return "not_found";
  if (usage().has(file)) return "in_use";
  if (!deleteMediaRow(getWriteContentDb(), file)) return "in_use";
  await fs.unlink(target).catch(() => {});
  return "deleted";
}
