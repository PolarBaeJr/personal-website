import "server-only";
import { revalidateTag } from "next/cache";
import { getWriteContentDb, seedSection } from "@/lib/content-data";
import { getContentVersion, insertContentVersion } from "@/lib/content-store/db";
import { validateSection, type SectionName } from "@/lib/content-store/schema";
import { fail, invalid, type WriteResult } from "@/lib/write/result";

export type ContentVersionInfo = {
  section: string;
  version: number;
  note: string;
  createdAt: string;
};

// The résumé header reads site emails and links; /socials expands
// site.emails.
function tagsFor(section: SectionName): string[] {
  if (section === "site") return ["content:site", "content:socials", "resume"];
  return [`content:${section}`];
}

export function revalidateAll(tags: string[]): void {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}

// Appends a version (one transaction) and makes it current. A baseVersion
// that is no longer current means someone else saved first.
export function insertAndRevalidate(
  section: string,
  data: unknown,
  note: string,
  actor: string,
  tags: string[],
  baseVersion?: number | null,
): WriteResult<ContentVersionInfo> {
  const result = insertContentVersion(
    getWriteContentDb(),
    { section, data: JSON.stringify(data), note, actor },
    { baseVersion },
  );
  if (!result.ok) {
    return fail(409, "changed elsewhere", { currentVersion: result.currentVersion });
  }
  revalidateAll(tags);
  const { meta } = result;
  return {
    ok: true,
    version: {
      section: meta.section,
      version: meta.versionNo,
      note: meta.note,
      createdAt: meta.createdAt,
    },
  };
}

export function saveSection(
  section: SectionName,
  data: unknown,
  note: string,
  actor: string,
  baseVersion?: number,
): WriteResult<ContentVersionInfo> {
  const checked = validateSection(section, data);
  if (!checked.ok) return invalid(checked.issues);
  return insertAndRevalidate(section, checked.data, note, actor, tagsFor(section), baseVersion);
}

// Copies an earlier version into a new current one. It must still fit the
// current schema.
export function restoreSection(
  section: SectionName,
  version: number,
  note: string,
  actor: string,
): WriteResult<ContentVersionInfo> {
  const row = getContentVersion(getWriteContentDb(), section, version);
  if (!row) return fail(404, "version_not_found");
  const checked = validateSection(section, JSON.parse(row.data));
  if (!checked.ok) return invalid(checked.issues);
  return insertAndRevalidate(
    section,
    checked.data,
    note ? `restore of v${version}: ${note}` : `restore of v${version}`,
    actor,
    tagsFor(section),
  );
}

// Saves the repo seed as a new version, e.g. after editing src/content/*.ts.
export function resetSectionToSeed(
  section: SectionName,
  note: string,
  actor: string,
): WriteResult<ContentVersionInfo> {
  return saveSection(
    section,
    seedSection(section),
    note ? `reset to seed: ${note}` : "reset to seed",
    actor,
  );
}
