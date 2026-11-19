// MCP server for editing the résumé .tex sources through the site's API.
// stdout carries the protocol, so logs go to stderr only.
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ApiError, call } from "./api.ts";

const type = z
  .enum(["accounting", "auditing", "finance", "tech", "general"])
  .describe("Résumé type");

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
  let data: { error?: string; reason?: string; variant?: string; logTail?: string } = {};
  try {
    data = JSON.parse(body);
  } catch {}
  const lines = [`HTTP ${res.status}: ${data.error ?? body.slice(0, 500)}`];
  if (data.variant || data.reason) {
    lines.push(`variant: ${data.variant ?? "public"}, reason: ${data.reason ?? "unknown"}`);
  }
  if (data.logTail) lines.push("", "Log tail:", data.logTail);
  return failure(lines.join("\n"));
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

async function getJson(route: string): Promise<CallToolResult> {
  const res = await call(route);
  if (!res.ok) return httpError(res);
  return text(await res.json());
}

const server = new McpServer({ name: "resume", version: "1.0.0" });

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
      "Compile .tex to the public PDF without saving anything. Returns the page count and, by default, a local path to the PDF so it can be opened.",
    inputSchema: {
      type,
      tex: z.string().min(1).describe("Full .tex source"),
      save_pdf: z.boolean().default(true).describe("Write the PDF to a temp file"),
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
      const pdf = new Uint8Array(await res.arrayBuffer());
      const pages = res.headers.get("x-resume-pages");
      const result: { ok: true; pages: number | null; bytes: number; path?: string } = {
        ok: true,
        pages: pages ? Number(pages) : null,
        bytes: pdf.byteLength,
      };
      if (save_pdf) {
        result.path = path.join(os.tmpdir(), `resume-preview-${type}-${randomUUID()}.pdf`);
        await fs.writeFile(result.path, pdf);
      }
      return text(result);
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
      note: z.string().max(500).describe("Short description of the change"),
    },
  },
  ({ type, tex, note }) =>
    guarded(async () => {
      const res = await call(`/api/resume/${type}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tex, note }),
        timeoutMs: 150_000,
      });
      if (res.status !== 201) return httpError(res);
      return text(await res.json());
    }),
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
    guarded(async () => {
      const res = await call(`/api/resume/${type}/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version }),
        timeoutMs: 150_000,
      });
      if (res.status !== 201) return httpError(res);
      return text(await res.json());
    }),
);

await server.connect(new StdioServerTransport());
console.error("resume-mcp: ready");
