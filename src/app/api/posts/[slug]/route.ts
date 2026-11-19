import {
  ensureContentSeeded,
  getWriteContentDb,
  postSection,
} from "@/lib/content-data";
import { getCurrentContent, listContentVersions } from "@/lib/content-store/db";
import {
  authorize,
  json,
  logError,
  readJsonBody,
  readNote,
  readVersionField,
  requestActor,
} from "@/lib/resume-api";
import { checkSlug, deletePost, updatePost } from "@/lib/write/posts";
import { writeResponse } from "@/lib/write/result";

type Ctx = RouteContext<"/api/posts/[slug]">;

// The current post (null once deleted) and its version history.
export async function GET(req: Request, ctx: Ctx) {
  const denied = authorize(req);
  if (denied) return denied;
  const { slug } = await ctx.params;
  if (checkSlug(slug)) return json({ error: "post_not_found" }, 404);
  try {
    ensureContentSeeded();
    const db = getWriteContentDb();
    const versions = listContentVersions(db, postSection(slug));
    if (versions.length === 0) return json({ error: "post_not_found" }, 404);
    const current = getCurrentContent(db, postSection(slug));
    return json({
      slug,
      current: current ? { meta: current.meta, data: JSON.parse(current.data) } : null,
      versions,
    });
  } catch (e) {
    logError("GET /api/posts/[slug]", e);
    return json({ error: "internal" }, 500);
  }
}

// Body: { data, note, baseVersion? }; data is the whole post.
export async function PUT(req: Request, ctx: Ctx) {
  const denied = authorize(req);
  if (denied) return denied;
  const { slug } = await ctx.params;
  if (checkSlug(slug)) return json({ error: "post_not_found" }, 404);
  try {
    ensureContentSeeded();
    const body = await readJsonBody(req);
    if (body instanceof Response) return body;
    const { data, note, baseVersion } = (body ?? {}) as {
      data?: unknown;
      note?: unknown;
      baseVersion?: unknown;
    };
    const cleanNote = readNote(note);
    if (cleanNote instanceof Response) return cleanNote;
    const base = readVersionField(baseVersion, "baseVersion", true);
    if (base instanceof Response) return base;
    return writeResponse(updatePost(slug, data, cleanNote, requestActor(req), base));
  } catch (e) {
    logError("PUT /api/posts/[slug]", e);
    return json({ error: "internal" }, 500);
  }
}

// Unpublishes; the history stays and restore brings it back.
export async function DELETE(req: Request, ctx: Ctx) {
  const denied = authorize(req);
  if (denied) return denied;
  const { slug } = await ctx.params;
  if (checkSlug(slug)) return json({ error: "post_not_found" }, 404);
  try {
    ensureContentSeeded();
    return writeResponse(deletePost(slug), 200);
  } catch (e) {
    logError("DELETE /api/posts/[slug]", e);
    return json({ error: "internal" }, 500);
  }
}
