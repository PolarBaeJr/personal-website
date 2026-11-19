// Content version store (SQLite via node:sqlite), next to the résumé DB.
// Builtins and relative .ts imports only, like resume-store/db.ts.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { resolveDbPath } from "../resume-store/db.ts";

// A section is "site", "home", "about", "projects", "socials" or "post:<slug>".
export type ContentMeta = {
  section: string;
  versionNo: number;
  note: string;
  actor: string;
  createdAt: string;
  isCurrent: boolean;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS content_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  data TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT 'api',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (section, version_no)
);
CREATE TABLE IF NOT EXISTS content_current (
  section TEXT PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES content_versions(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

const META_COLUMNS = `
  v.section, v.version_no, v.note, v.actor, v.created_at,
  c.version_id IS NOT NULL AS is_current
`;
const META_FROM = `content_versions v LEFT JOIN content_current c ON c.version_id = v.id`;

type MetaRow = {
  section: string;
  version_no: number;
  note: string;
  actor: string;
  created_at: string;
  is_current: number;
};

function toMeta(row: MetaRow): ContentMeta {
  return {
    section: row.section,
    versionNo: row.version_no,
    note: row.note,
    actor: row.actor,
    createdAt: row.created_at,
    isCurrent: row.is_current === 1,
  };
}

function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

function migrate(db: DatabaseSync) {
  const version = () =>
    (db.prepare("PRAGMA user_version").get() as { user_version: number })
      .user_version;
  if (version() >= 1) return;
  transaction(db, () => {
    if (version() >= 1) return;
    db.exec(SCHEMA);
    db.exec("PRAGMA user_version = 1");
  });
}

export function resolveContentDbPath(): string {
  return (
    process.env.CONTENT_DB || path.join(path.dirname(resolveDbPath()), "content.db")
  );
}

export function openContentDb(
  file: string,
  opts: { readOnly?: boolean } = {},
): DatabaseSync {
  if (opts.readOnly) {
    const db = new DatabaseSync(file, { readOnly: true });
    db.exec("PRAGMA busy_timeout = 5000");
    return db;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(
    "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;",
  );
  migrate(db);
  return db;
}

export function hasAnyVersion(db: DatabaseSync, section: string): boolean {
  return (
    db
      .prepare("SELECT 1 FROM content_versions WHERE section = ? LIMIT 1")
      .get(section) !== undefined
  );
}

// Every section or post that has ever had a version, deleted posts included.
export function sectionsWithHistory(db: DatabaseSync): string[] {
  const rows = db
    .prepare("SELECT DISTINCT section FROM content_versions ORDER BY section")
    .all() as { section: string }[];
  return rows.map((row) => row.section);
}

export function getCurrentContent(
  db: DatabaseSync,
  section: string,
): { meta: ContentMeta; data: string } | undefined {
  const row = db
    .prepare(
      `SELECT ${META_COLUMNS}, v.data FROM content_current c
       JOIN content_versions v ON v.id = c.version_id WHERE c.section = ?`,
    )
    .get(section) as (MetaRow & { data: string }) | undefined;
  return row && { meta: toMeta(row), data: row.data };
}

// Current rows whose section starts with prefix ("" for all).
export function listCurrentContent(
  db: DatabaseSync,
  prefix: string,
): Array<{ meta: ContentMeta; data: string; versionCount: number }> {
  const rows = db
    .prepare(
      `SELECT ${META_COLUMNS}, v.data,
         (SELECT COUNT(*) FROM content_versions x WHERE x.section = v.section) AS version_count
       FROM content_current c JOIN content_versions v ON v.id = c.version_id
       WHERE substr(c.section, 1, length(?)) = ? ORDER BY c.section`,
    )
    .all(prefix, prefix) as (MetaRow & { data: string; version_count: number })[];
  return rows.map((row) => ({
    meta: toMeta(row),
    data: row.data,
    versionCount: row.version_count,
  }));
}

export function listContentVersions(db: DatabaseSync, section: string): ContentMeta[] {
  const rows = db
    .prepare(
      `SELECT ${META_COLUMNS} FROM ${META_FROM} WHERE v.section = ?
       ORDER BY v.created_at DESC, v.version_no DESC`,
    )
    .all(section) as MetaRow[];
  return rows.map(toMeta);
}

export function getContentVersion(
  db: DatabaseSync,
  section: string,
  versionNo: number,
): { meta: ContentMeta; data: string } | undefined {
  const row = db
    .prepare(
      `SELECT ${META_COLUMNS}, v.data FROM ${META_FROM} WHERE v.section = ? AND v.version_no = ?`,
    )
    .get(section, versionNo) as (MetaRow & { data: string }) | undefined;
  return row && { meta: toMeta(row), data: row.data };
}

export type InsertResult =
  | { ok: true; meta: ContentMeta }
  | { ok: false; currentVersion: number | null };

// Appends a version and makes it current. With baseVersion set, refuses
// (ok: false) unless the current version is still that one; null means
// "there must be no current version".
export function insertContentVersion(
  db: DatabaseSync,
  v: { section: string; data: string; note: string; actor: string },
  opts: { baseVersion?: number | null } = {},
): InsertResult {
  return transaction(db, (): InsertResult => {
    const current = db
      .prepare(
        `SELECT v.version_no FROM content_current c JOIN content_versions v ON v.id = c.version_id
         WHERE c.section = ?`,
      )
      .get(v.section) as { version_no: number } | undefined;
    const currentVersion = current?.version_no ?? null;
    if (opts.baseVersion !== undefined && opts.baseVersion !== currentVersion) {
      return { ok: false, currentVersion };
    }
    const { n } = db
      .prepare(
        "SELECT COALESCE(MAX(version_no), 0) + 1 AS n FROM content_versions WHERE section = ?",
      )
      .get(v.section) as { n: number };
    const result = db
      .prepare(
        "INSERT INTO content_versions (section, version_no, data, note, actor) VALUES (?, ?, ?, ?, ?)",
      )
      .run(v.section, n, v.data, v.note, v.actor);
    db.prepare(
      `INSERT INTO content_current (section, version_id) VALUES (?, ?)
       ON CONFLICT(section) DO UPDATE SET version_id = excluded.version_id, updated_at = CURRENT_TIMESTAMP`,
    ).run(v.section, Number(result.lastInsertRowid));
    const row = db
      .prepare(`SELECT ${META_COLUMNS} FROM ${META_FROM} WHERE v.id = ?`)
      .get(Number(result.lastInsertRowid)) as MetaRow;
    return { ok: true, meta: toMeta(row) };
  });
}

// Drops the current pointer only; the history stays for restore.
export function deleteCurrentContent(db: DatabaseSync, section: string): boolean {
  return (
    Number(db.prepare("DELETE FROM content_current WHERE section = ?").run(section).changes) > 0
  );
}
