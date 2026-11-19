import { authorize, json, logError, parseVersionParam } from "@/lib/resume-api";
import { ensureSeeded, getWriteDb } from "@/lib/resume-data";
import { getCurrentMeta, getVersion } from "@/lib/resume-store/db";
import { isResumeType } from "@/lib/resume-types";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/resume/[type]/versions/[version]">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type, version } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  const parsed = parseVersionParam(version);
  if (parsed === null) return json({ error: "invalid_version" }, 400);
  try {
    await ensureSeeded();
    const db = getWriteDb();
    const versionNo = parsed === "current" ? getCurrentMeta(db, type)?.versionNo : parsed;
    const row = versionNo === undefined ? undefined : getVersion(db, type, versionNo);
    if (!row) return json({ error: "version_not_found" }, 404);
    const { tex, ...meta } = row;
    return json({ meta, tex });
  } catch (e) {
    logError("GET /api/resume/[type]/versions/[version]", e);
    return json({ error: "internal" }, 500);
  }
}
