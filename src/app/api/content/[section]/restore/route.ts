import { ensureContentSeeded } from "@/lib/content-data";
import { isSectionName } from "@/lib/content-store/schema";
import {
  authorize,
  json,
  logError,
  readJsonBody,
  readNote,
  readVersionField,
} from "@/lib/resume-api";
import { restoreSection } from "@/lib/write/content";
import { writeResponse } from "@/lib/write/result";

// Copies an earlier version into a new current version. History is
// append-only, so nothing is overwritten.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/content/[section]/restore">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { section } = await ctx.params;
  if (!isSectionName(section)) return json({ error: "unknown_section" }, 404);
  try {
    ensureContentSeeded();
    const body = await readJsonBody(req);
    if (body instanceof Response) return body;
    const { version, note } = (body ?? {}) as { version?: unknown; note?: unknown };
    const versionNo = readVersionField(version, "version");
    if (versionNo instanceof Response) return versionNo;
    const extra = readNote(note);
    if (extra instanceof Response) return extra;
    return writeResponse(restoreSection(section, versionNo, extra, "api"));
  } catch (e) {
    logError("POST /api/content/[section]/restore", e);
    return json({ error: "internal" }, 500);
  }
}
