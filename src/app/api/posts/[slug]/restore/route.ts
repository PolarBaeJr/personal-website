import { ensureContentSeeded } from "@/lib/content-data";
import {
  authorize,
  json,
  logError,
  readJsonBody,
  readNote,
  readVersionField,
} from "@/lib/resume-api";
import { checkSlug, restorePost } from "@/lib/write/posts";
import { writeResponse } from "@/lib/write/result";

// Copies an earlier version into a new current one; also undoes a delete.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/posts/[slug]/restore">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { slug } = await ctx.params;
  if (checkSlug(slug)) return json({ error: "post_not_found" }, 404);
  try {
    ensureContentSeeded();
    const body = await readJsonBody(req);
    if (body instanceof Response) return body;
    const { version, note } = (body ?? {}) as { version?: unknown; note?: unknown };
    const versionNo = readVersionField(version, "version");
    if (versionNo instanceof Response) return versionNo;
    const extra = readNote(note);
    if (extra instanceof Response) return extra;
    return writeResponse(restorePost(slug, versionNo, extra, "api"));
  } catch (e) {
    logError("POST /api/posts/[slug]/restore", e);
    return json({ error: "internal" }, 500);
  }
}
