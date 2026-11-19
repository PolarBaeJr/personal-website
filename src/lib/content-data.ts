import "server-only";
import fs from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { aboutSeed } from "@/content/about";
import { homeSeed } from "@/content/home";
import { projectsSeed } from "@/content/projects";
import { siteSeed } from "@/content/site";
import { socialsSeed } from "@/content/socials";
import {
  getCurrentContent,
  hasAnyVersion,
  insertContentVersion,
  listCurrentContent,
  openContentDb,
  resolveContentDbPath,
} from "@/lib/content-store/db";
import {
  SECTIONS,
  validatePost,
  validateSection,
  type PostData,
  type SectionData,
  type SectionName,
} from "@/lib/content-store/schema";
import { visibleProjects } from "@/lib/content-view";
import { getSeedPostSlugs, readSeedPost } from "@/lib/posts";

// Uncached, synchronous reads of the content DB with the repo seeds as the
// fallback. Nothing here opens the DB at module scope: Next evaluates
// modules at build.

const SEEDS: SectionData = {
  site: siteSeed,
  home: homeSeed,
  about: aboutSeed,
  projects: projectsSeed,
  socials: socialsSeed,
};

export function seedSection<S extends SectionName>(section: S): SectionData[S] {
  return SEEDS[section];
}

export function postSection(slug: string): string {
  return `post:${slug}`;
}

// Seed posts that parse and validate; a bad .md file is logged and skipped.
export function seedPosts(): Array<{ slug: string; data: PostData }> {
  return getSeedPostSlugs().flatMap((slug) => {
    try {
      const result = validatePost(readSeedPost(slug));
      if (result.ok) return [{ slug, data: result.data }];
      console.error(`content seed post:${slug}: ${result.issues[0]?.path} ${result.issues[0]?.message}`);
    } catch (e) {
      console.error(`content seed post:${slug}: ${(e as Error).message}`);
    }
    return [];
  });
}

let readDb: DatabaseSync | undefined;

// Read-only: never creates the DB file or seeds. undefined means "use the
// seeds" (building, no DB yet, or the DB can't be opened).
function readHandle(): DatabaseSync | undefined {
  if (process.env.NEXT_PHASE === "phase-production-build") return undefined;
  const file = resolveContentDbPath();
  if (!fs.existsSync(file)) return undefined;
  try {
    readDb ??= openContentDb(file, { readOnly: true });
    return readDb;
  } catch (e) {
    console.error(`content read: ${(e as Error).message}`);
    return undefined;
  }
}

function parseStored<T>(
  label: string,
  data: string,
  validate: (data: unknown) => { ok: true; data: T } | { ok: false },
): T | undefined {
  try {
    const result = validate(JSON.parse(data));
    if (result.ok) return result.data;
  } catch {}
  console.error(`content read ${label}: stored version is invalid; using the seed`);
  return undefined;
}

export function readSectionSync<S extends SectionName>(section: S): SectionData[S] {
  const db = readHandle();
  if (!db) return seedSection(section);
  try {
    const row = getCurrentContent(db, section);
    if (!row) return seedSection(section);
    return (
      parseStored(section, row.data, (d) => validateSection(section, d)) ??
      seedSection(section)
    );
  } catch (e) {
    console.error(`content read ${section}: ${(e as Error).message}`);
    return seedSection(section);
  }
}

// Current posts, plus seed posts that have never been in the DB. A deleted
// post has history, so its seed does not come back.
export function readPostsSync(): Array<{ slug: string; data: PostData }> {
  const seeds = seedPosts();
  const db = readHandle();
  if (!db) return seeds;
  try {
    const stored = listCurrentContent(db, "post:").flatMap((row) => {
      const slug = row.meta.section.slice("post:".length);
      const data = parseStored(row.meta.section, row.data, validatePost);
      return data ? [{ slug, data }] : [];
    });
    const fresh = seeds.filter(({ slug }) => !hasAnyVersion(db, postSection(slug)));
    return [...stored, ...fresh];
  } catch (e) {
    console.error(`content read posts: ${(e as Error).message}`);
    return seeds;
  }
}

export function readPostSync(slug: string): PostData | undefined {
  return readPostsSync().find((post) => post.slug === slug)?.data;
}

// For the proxy: whether a visitor may open the page.
export function projectExists(slug: string): boolean {
  return visibleProjects(readSectionSync("projects")).some((p) => p.slug === slug);
}

export function postExists(slug: string): boolean {
  const post = readPostSync(slug);
  return post !== undefined && !post.draft;
}

let writeDb: DatabaseSync | undefined;

// Only for request-time code (route handlers); creates the file if needed.
export function getWriteContentDb(): DatabaseSync {
  writeDb ??= openContentDb(resolveContentDbPath());
  return writeDb;
}

let seeded = false;

// Inserts version 1 ("seed") for each section and seed post that has never
// had a version. Deleted posts keep their history, so they stay deleted.
export function ensureContentSeeded(): void {
  if (seeded) return;
  const db = getWriteContentDb();
  for (const section of SECTIONS) {
    if (hasAnyVersion(db, section)) continue;
    const result = validateSection(section, seedSection(section));
    if (!result.ok) {
      console.error(`content seed ${section}: ${result.issues[0]?.path} ${result.issues[0]?.message}`);
      continue;
    }
    insertContentVersion(
      db,
      { section, data: JSON.stringify(result.data), note: "seed", actor: "seed" },
      { baseVersion: null },
    );
  }
  for (const { slug, data } of seedPosts()) {
    const section = postSection(slug);
    if (hasAnyVersion(db, section)) continue;
    insertContentVersion(
      db,
      { section, data: JSON.stringify(data), note: "seed", actor: "seed" },
      { baseVersion: null },
    );
  }
  seeded = true;
}
