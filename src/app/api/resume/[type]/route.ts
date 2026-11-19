import { authorize, json, logError, readTexPayload } from "@/lib/resume-api";
import { ensureSeeded, getWriteDb } from "@/lib/resume-data";
import { listVersions } from "@/lib/resume-store/db";
import { isResumeType } from "@/lib/resume-types";
import { saveResume } from "@/lib/write/resume";
import { writeResponse } from "@/lib/write/result";

type Ctx = RouteContext<"/api/resume/[type]">;

export async function GET(req: Request, ctx: Ctx) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  try {
    await ensureSeeded();
    return json({ type, versions: listVersions(getWriteDb(), type) });
  } catch (e) {
    logError("GET /api/resume/[type]", e);
    return json({ error: "internal" }, 500);
  }
}

// Update: compile both PDFs, then save a new current version. A failed
// compile saves nothing.
export async function POST(req: Request, ctx: Ctx) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  try {
    await ensureSeeded();
    const payload = await readTexPayload(req);
    if (payload instanceof Response) return payload;
    return writeResponse(await saveResume(type, payload.tex, payload.note));
  } catch (e) {
    logError("POST /api/resume/[type]", e);
    return json({ error: "internal" }, 500);
  }
}
