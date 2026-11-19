import "server-only";
import crypto from "node:crypto";
import { revalidateTag } from "next/cache";
import { MAX_TEX_BYTES } from "@/lib/resume-store/compile";
import type { ResumeType } from "@/lib/resume-types";

// Helpers for the token-protected résumé API. Never log the token, headers,
// bodies or private PDFs from here or the handlers.

export const MAX_BODY_BYTES = 512 * 1024;
const MAX_NOTE_CHARS = 500;

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

export function authorize(req: Request): Response | null {
  const expected = process.env.RESUME_API_TOKEN;
  if (!expected) return json({ error: "disabled" }, 503);
  const match = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "");
  if (match && crypto.timingSafeEqual(digest(match[1]), digest(expected))) {
    return null;
  }
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "www-authenticate": "Bearer",
    },
  });
}

// Who made a write, for the history. Only call after authorize(): just
// holders of the API token can set x-actor, and only to a known value.
export function requestActor(req: Request): string {
  return req.headers.get("x-actor") === "claude-app" ? "claude-app" : "api";
}

function tooLarge() {
  return json({ error: "too_large", maxBytes: MAX_BODY_BYTES }, 413);
}

export async function readBodyLimited(
  req: Request,
  max: number,
): Promise<Uint8Array | Response> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > max) return tooLarge();
  if (!req.body) return new Uint8Array();

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return tooLarge();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readJsonBody(req: Request): Promise<unknown | Response> {
  const body = await readBodyLimited(req, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
}

export function readNote(value: unknown): string | Response {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return json({ error: "note must be a string" }, 400);
  if (value.length > MAX_NOTE_CHARS) {
    return json({ error: `note must be at most ${MAX_NOTE_CHARS} characters` }, 400);
  }
  return value.trim();
}

export async function readTexPayload(
  req: Request,
): Promise<{ tex: string; note: string } | Response> {
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  let tex: unknown;
  let note: unknown;

  if (type === "application/json") {
    const data = await readJsonBody(req);
    if (data instanceof Response) return data;
    if (!data || typeof data !== "object") return json({ error: "invalid_json" }, 400);
    ({ tex, note } = data as { tex?: unknown; note?: unknown });
  } else if (type === "text/plain" || type === "application/x-tex") {
    const body = await readBodyLimited(req, MAX_BODY_BYTES);
    if (body instanceof Response) return body;
    tex = new TextDecoder().decode(body);
    note = new URL(req.url).searchParams.get("note") ?? undefined;
  } else {
    return json(
      { error: "content-type must be application/json, text/plain or application/x-tex" },
      415,
    );
  }

  if (typeof tex !== "string" || !tex.trim()) {
    return json({ error: "tex is required" }, 400);
  }
  if (Buffer.byteLength(tex, "utf8") > MAX_TEX_BYTES) {
    return json({ error: "too_large", maxTexBytes: MAX_TEX_BYTES }, 413);
  }
  const cleanNote = readNote(note);
  if (cleanNote instanceof Response) return cleanNote;
  return { tex, note: cleanNote };
}

export function containsPrivateDetails(tex: string): boolean {
  const { RESUME_PHONE, RESUME_ADDRESS } = process.env;
  const lower = tex.toLowerCase();
  if (RESUME_ADDRESS?.trim() && lower.includes(RESUME_ADDRESS.trim().toLowerCase())) {
    return true;
  }
  if (RESUME_PHONE?.trim()) {
    if (tex.includes(RESUME_PHONE.trim())) return true;
    const digits = RESUME_PHONE.replace(/\D/g, "");
    if (digits.length >= 7) {
      const loose = new RegExp(`(?<!\\d)${[...digits].join("[\\s().+-]*")}(?!\\d)`);
      if (loose.test(tex)) return true;
    }
  }
  return false;
}

export function revalidateResume(type: ResumeType): void {
  revalidateTag(`resume:${type}`, { expire: 0 });
}

// A version number from a JSON body; optional only when allowMissing.
export function readVersionField(value: unknown, field: string): number | Response;
export function readVersionField(
  value: unknown,
  field: string,
  allowMissing: true,
): number | undefined | Response;
export function readVersionField(
  value: unknown,
  field: string,
  allowMissing = false,
): number | undefined | Response {
  if (value === undefined && allowMissing) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return json({ error: `${field} must be a positive integer` }, 400);
  }
  return value;
}

export function parseVersionParam(v: string): number | "current" | null {
  if (v === "current") return "current";
  return /^[1-9]\d{0,8}$/.test(v) ? Number(v) : null;
}

export function logError(route: string, e: unknown) {
  console.error(`${route}: ${(e as Error).message}`);
}
