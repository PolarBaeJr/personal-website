import { getWriteContentDb } from "@/lib/content-data";
import { linkStatus } from "@/lib/content-store/media";
import { authorize, json, logError } from "@/lib/resume-api";

// Whether an upload link has its photo yet (MCP get_upload_link). Token only.
export async function GET(req: Request, ctx: RouteContext<"/api/media/links/[id]">) {
  const denied = authorize(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const status = linkStatus(getWriteContentDb(), id);
    if (!status) return json({ error: "not_found" }, 404);
    return json(status);
  } catch (e) {
    logError("GET /api/media/links/[id]", e);
    return json({ error: "internal" }, 500);
  }
}
