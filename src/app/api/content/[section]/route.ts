import { ensureContentSeeded, getWriteContentDb } from "@/lib/content-data";
import { listContentVersions } from "@/lib/content-store/db";
import { isSectionName } from "@/lib/content-store/schema";
import {
  authorize,
  json,
  logError,
  readJsonBody,
  readNote,
  readVersionField,
} from "@/lib/resume-api";
import { saveSection } from "@/lib/write/content";
import { writeResponse } from "@/lib/write/result";

type Ctx = RouteContext<"/api/content/[section]">;

export async function GET(req: Request, ctx: Ctx) {
  const denied = authorize(req);
  if (denied) return denied;
  const { section } = await ctx.params;
  if (!isSectionName(section)) return json({ error: "unknown_section" }, 404);
  try {
    ensureContentSeeded();
    return json({ section, versions: listContentVersions(getWriteContentDb(), section) });
  } catch (e) {
    logError("GET /api/content/[section]", e);
    return json({ error: "internal" }, 500);
  }
}

// Saves the whole section as a new current version. With baseVersion, the
// save is refused (409) if someone else saved since.
export async function POST(req: Request, ctx: Ctx) {
  const denied = authorize(req);
  if (denied) return denied;
  const { section } = await ctx.params;
  if (!isSectionName(section)) return json({ error: "unknown_section" }, 404);
  try {
    ensureContentSeeded();
    const body = await readJsonBody(req);
    if (body instanceof Response) return body;
    const { data, note, baseVersion } = (body ?? {}) as {
      data?: unknown;
      note?: unknown;
      baseVersion?: unknown;
    };
    if (data === undefined) return json({ error: "data is required" }, 400);
    const cleanNote = readNote(note);
    if (cleanNote instanceof Response) return cleanNote;
    const base = readVersionField(baseVersion, "baseVersion", true);
    if (base instanceof Response) return base;
    return writeResponse(saveSection(section, data, cleanNote, "api", base));
  } catch (e) {
    logError("POST /api/content/[section]", e);
    return json({ error: "internal" }, 500);
  }
}
