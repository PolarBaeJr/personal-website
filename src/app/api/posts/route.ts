import { ensureContentSeeded, getWriteContentDb } from "@/lib/content-data";
import { listCurrentContent, sectionsWithHistory } from "@/lib/content-store/db";
import type { PostData } from "@/lib/content-store/schema";
import { authorize, json, logError, readJsonBody, readNote } from "@/lib/resume-api";
import { createPost } from "@/lib/write/posts";
import { writeResponse } from "@/lib/write/result";

// Every current post, drafts included, newest first; deleted lists slugs
// that only have history (restorable).
export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    ensureContentSeeded();
    const db = getWriteContentDb();
    const posts = listCurrentContent(db, "post:").map(({ meta, data, versionCount }) => {
      const { title, date, summary, draft } = JSON.parse(data) as PostData;
      return {
        slug: meta.section.slice("post:".length),
        title,
        date,
        summary,
        draft: draft === true,
        version: meta.versionNo,
        updatedAt: meta.createdAt,
        versionCount,
      };
    });
    const live = new Set(posts.map((post) => `post:${post.slug}`));
    const deleted = sectionsWithHistory(db)
      .filter((section) => section.startsWith("post:") && !live.has(section))
      .map((section) => section.slice("post:".length));
    posts.sort((a, b) => b.date.localeCompare(a.date));
    return json({ posts, deleted });
  } catch (e) {
    logError("GET /api/posts", e);
    return json({ error: "internal" }, 500);
  }
}

// Body: { slug, data: { title, date, summary, body, draft? }, note }.
export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    ensureContentSeeded();
    const body = await readJsonBody(req);
    if (body instanceof Response) return body;
    const { slug, data, note } = (body ?? {}) as {
      slug?: unknown;
      data?: unknown;
      note?: unknown;
    };
    if (typeof slug !== "string") return json({ error: "slug is required" }, 400);
    const cleanNote = readNote(note);
    if (cleanNote instanceof Response) return cleanNote;
    return writeResponse(createPost(slug, data, cleanNote, "api"));
  } catch (e) {
    logError("POST /api/posts", e);
    return json({ error: "internal" }, 500);
  }
}
