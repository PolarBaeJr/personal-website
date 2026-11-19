import {
  ensureContentSeeded,
  getWriteContentDb,
  postSection,
} from "@/lib/content-data";
import { getContentVersion, getCurrentContent } from "@/lib/content-store/db";
import { authorize, json, logError, parseVersionParam } from "@/lib/resume-api";
import { checkSlug } from "@/lib/write/posts";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/posts/[slug]/versions/[version]">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { slug, version } = await ctx.params;
  if (checkSlug(slug)) return json({ error: "post_not_found" }, 404);
  const parsed = parseVersionParam(version);
  if (parsed === null) return json({ error: "invalid_version" }, 400);
  try {
    ensureContentSeeded();
    const db = getWriteContentDb();
    const row =
      parsed === "current"
        ? getCurrentContent(db, postSection(slug))
        : getContentVersion(db, postSection(slug), parsed);
    if (!row) return json({ error: "version_not_found" }, 404);
    return json({ meta: row.meta, data: JSON.parse(row.data) });
  } catch (e) {
    logError("GET /api/posts/[slug]/versions/[version]", e);
    return json({ error: "internal" }, 500);
  }
}
