import { ensureContentSeeded } from "@/lib/content-data";
import { isSectionName } from "@/lib/content-store/schema";
import {
  authorize,
  json,
  logError,
  MAX_BODY_BYTES,
  readBodyLimited,
  readNote,
} from "@/lib/resume-api";
import { resetSectionToSeed } from "@/lib/write/content";
import { writeResponse } from "@/lib/write/result";

// Saves the repo seed as a new current version. Body: optional { note }.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/content/[section]/reset">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { section } = await ctx.params;
  if (!isSectionName(section)) return json({ error: "unknown_section" }, 404);
  try {
    ensureContentSeeded();
    const raw = await readBodyLimited(req, MAX_BODY_BYTES);
    if (raw instanceof Response) return raw;
    // Not readJsonBody: an empty body is allowed here, and it would reject it.
    let note: unknown;
    if (raw.byteLength > 0) {
      try {
        ({ note } = (JSON.parse(new TextDecoder().decode(raw)) ?? {}) as { note?: unknown });
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
    }
    const cleanNote = readNote(note);
    if (cleanNote instanceof Response) return cleanNote;
    return writeResponse(resetSectionToSeed(section, cleanNote, "api"));
  } catch (e) {
    logError("POST /api/content/[section]/reset", e);
    return json({ error: "internal" }, 500);
  }
}
