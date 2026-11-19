import { authorize, json, logError, readJsonBody, readNote } from "@/lib/resume-api";
import { ensureSeeded } from "@/lib/resume-data";
import { isResumeType } from "@/lib/resume-types";
import { restoreResume } from "@/lib/write/resume";
import { writeResponse } from "@/lib/write/result";

// Copies an earlier tex version into a new current version (see
// restoreResume).
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/resume/[type]/restore">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  try {
    await ensureSeeded();
    const data = await readJsonBody(req);
    if (data instanceof Response) return data;
    const { version, note } = (data ?? {}) as { version?: unknown; note?: unknown };
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
      return json({ error: "version must be a positive integer" }, 400);
    }
    const extra = readNote(note);
    if (extra instanceof Response) return extra;

    return writeResponse(await restoreResume(type, version, extra));
  } catch (e) {
    logError("POST /api/resume/[type]/restore", e);
    return json({ error: "internal" }, 500);
  }
}
