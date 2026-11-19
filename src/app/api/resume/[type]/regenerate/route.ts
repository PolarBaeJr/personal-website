import { authorize, json, logError } from "@/lib/resume-api";
import { ensureSeeded } from "@/lib/resume-data";
import { isResumeType } from "@/lib/resume-types";
import { regenerateResume } from "@/lib/write/resume";
import { writeResponse } from "@/lib/write/result";

// Recompiles the current version's PDFs in place, e.g. after the phone or
// address changes. Saves no new version.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/resume/[type]/regenerate">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  try {
    await ensureSeeded();
    return writeResponse(await regenerateResume(type), 200);
  } catch (e) {
    logError("POST /api/resume/[type]/regenerate", e);
    return json({ error: "internal" }, 500);
  }
}
