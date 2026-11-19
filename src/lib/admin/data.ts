import "server-only";
import {
  ensureContentSeeded,
  getWriteContentDb,
  seedSection,
} from "@/lib/content-data";
import {
  getContentVersion,
  getCurrentContent,
  listContentVersions,
  listCurrentContent,
  listRecentVersions,
  sectionsWithHistory,
  type ContentMeta,
} from "@/lib/content-store/db";
import {
  validatePost,
  validateSection,
  type PostData,
  type SectionData,
  type SectionName,
} from "@/lib/content-store/schema";

// Uncached reads for the admin pages, straight from the write DB. Editors
// get the whole stored section, hidden items included: saving what the
// public getters return would delete those.

export function loadSection<S extends SectionName>(
  section: S,
): { data: SectionData[S]; version: number | null } {
  ensureContentSeeded();
  const row = getCurrentContent(getWriteContentDb(), section);
  if (!row) return { data: seedSection(section), version: null };
  const checked = validateSection(section, JSON.parse(row.data));
  // A stored version that no longer fits the schema: start from the seed,
  // but keep the version so the save still lines up.
  return {
    data: checked.ok ? checked.data : seedSection(section),
    version: row.meta.versionNo,
  };
}

export type AdminPost = { slug: string; data: PostData; version: number; updatedAt: string };

export function loadPosts(): AdminPost[] {
  ensureContentSeeded();
  return listCurrentContent(getWriteContentDb(), "post:")
    .flatMap((row) => {
      const checked = validatePost(JSON.parse(row.data));
      if (!checked.ok) return [];
      return [
        {
          slug: row.meta.section.slice("post:".length),
          data: checked.data,
          version: row.meta.versionNo,
          updatedAt: row.meta.createdAt,
        },
      ];
    })
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
}

export function loadPost(slug: string): AdminPost | undefined {
  return loadPosts().find((post) => post.slug === slug);
}

// Deleted posts keep their history, so they can be restored.
export function loadDeletedPostSlugs(): string[] {
  ensureContentSeeded();
  const db = getWriteContentDb();
  const live = new Set(listCurrentContent(db, "post:").map((row) => row.meta.section));
  return sectionsWithHistory(db)
    .filter((section) => section.startsWith("post:") && !live.has(section))
    .map((section) => section.slice("post:".length));
}

export function loadHistory(section: string): ContentMeta[] {
  ensureContentSeeded();
  return listContentVersions(getWriteContentDb(), section);
}

export function loadVersion(
  section: string,
  version: number,
): { meta: ContentMeta; data: unknown } | undefined {
  const row = getContentVersion(getWriteContentDb(), section, version);
  if (!row) return undefined;
  try {
    return { meta: row.meta, data: JSON.parse(row.data) };
  } catch {
    return undefined;
  }
}

export function loadRecentChanges(limit: number): ContentMeta[] {
  ensureContentSeeded();
  return listRecentVersions(getWriteContentDb(), limit);
}

// Today in the server's time zone (TZ), from SQLite, as YYYY-MM-DD.
export function today(): string {
  const row = getWriteContentDb()
    .prepare("SELECT date('now', 'localtime') AS d")
    .get() as { d: string };
  return row.d;
}
