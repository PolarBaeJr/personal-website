import { ensureContentSeeded, getWriteContentDb } from "@/lib/content-data";
import { getContentVersion, getCurrentContent } from "@/lib/content-store/db";
import { isSectionName } from "@/lib/content-store/schema";
import { authorize, json, logError, parseVersionParam } from "@/lib/resume-api";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/content/[section]/versions/[version]">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { section, version } = await ctx.params;
  if (!isSectionName(section)) return json({ error: "unknown_section" }, 404);
  const parsed = parseVersionParam(version);
  if (parsed === null) return json({ error: "invalid_version" }, 400);
  try {
    ensureContentSeeded();
    const db = getWriteContentDb();
    const row =
      parsed === "current"
        ? getCurrentContent(db, section)
        : getContentVersion(db, section, parsed);
    if (!row) return json({ error: "version_not_found" }, 404);
    return json({ meta: row.meta, data: JSON.parse(row.data) });
  } catch (e) {
    logError("GET /api/content/[section]/versions/[version]", e);
    return json({ error: "internal" }, 500);
  }
}
