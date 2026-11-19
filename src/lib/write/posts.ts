import "server-only";
import { getWriteContentDb, postSection } from "@/lib/content-data";
import {
  deleteCurrentContent,
  getContentVersion,
  getCurrentContent,
} from "@/lib/content-store/db";
import { postSlugSchema, validatePost } from "@/lib/content-store/schema";
import { renderMarkdown } from "@/lib/posts";
import {
  insertAndRevalidate,
  revalidateAll,
  type ContentVersionInfo,
} from "@/lib/write/content";
import { fail, invalid, type WriteResult } from "@/lib/write/result";

function tagsFor(slug: string): string[] {
  return ["posts", `post:${slug}`];
}

export function checkSlug(slug: string): WriteResult<never> | null {
  const result = postSlugSchema.safeParse(slug);
  if (result.success) return null;
  return invalid(result.error.issues.map((issue) => ({ path: "slug", message: issue.message })));
}

export function createPost(
  slug: string,
  data: unknown,
  note: string,
  actor: string,
): WriteResult<ContentVersionInfo> {
  const badSlug = checkSlug(slug);
  if (badSlug) return badSlug;
  const checked = validatePost(data);
  if (!checked.ok) return invalid(checked.issues);
  // baseVersion null: only if there is no current post with this slug.
  const result = insertAndRevalidate(
    postSection(slug),
    checked.data,
    note || "create",
    actor,
    tagsFor(slug),
    null,
  );
  return !result.ok && result.status === 409 ? fail(409, "post_exists") : result;
}

export function updatePost(
  slug: string,
  data: unknown,
  note: string,
  actor: string,
  baseVersion?: number,
): WriteResult<ContentVersionInfo> {
  const section = postSection(slug);
  const current = getCurrentContent(getWriteContentDb(), section);
  if (!current) return fail(404, "post_not_found");
  const checked = validatePost(data);
  if (!checked.ok) return invalid(checked.issues);
  return insertAndRevalidate(
    section,
    checked.data,
    note,
    actor,
    tagsFor(slug),
    baseVersion ?? current.meta.versionNo,
  );
}

// Unpublishes the post. Its history stays, so restorePost brings it back.
export function deletePost(slug: string): WriteResult<{ slug: string; deleted: true }> {
  if (!deleteCurrentContent(getWriteContentDb(), postSection(slug))) {
    return fail(404, "post_not_found");
  }
  revalidateAll(tagsFor(slug));
  return { ok: true, version: { slug, deleted: true } };
}

export function restorePost(
  slug: string,
  version: number,
  note: string,
  actor: string,
): WriteResult<ContentVersionInfo> {
  const section = postSection(slug);
  const row = getContentVersion(getWriteContentDb(), section, version);
  if (!row) return fail(404, "version_not_found");
  const checked = validatePost(JSON.parse(row.data));
  if (!checked.ok) return invalid(checked.issues);
  return insertAndRevalidate(
    section,
    checked.data,
    note ? `restore of v${version}: ${note}` : `restore of v${version}`,
    actor,
    tagsFor(slug),
  );
}

export function previewPost(body: string): { html: string } {
  return { html: renderMarkdown(body) };
}
