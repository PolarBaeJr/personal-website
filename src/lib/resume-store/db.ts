// Résumé version store (SQLite via node:sqlite). Shared by Next and plain
// node scripts, so only node:* builtins and relative .ts imports here.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { RESUME_TYPES, type ResumeType } from "../resume-types.ts";

export type VersionSource = "tex" | "import";

export type VersionMeta = {
  id: number;
  type: ResumeType;
  versionNo: number;
  note: string;
  source: VersionSource;
  originalFilename: string | null;
  createdAt: string;
  hasTex: boolean;
  hasPdfPublic: boolean;
  hasPdfPrivate: boolean;
  isCurrent: boolean;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('accounting','auditing','finance','tech','general')),
  version_no INTEGER NOT NULL,
  tex TEXT,
  pdf_public BLOB,
  pdf_private BLOB,
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('tex','import')),
  original_filename TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (type, version_no),
  CHECK (source <> 'tex' OR tex IS NOT NULL),
  CHECK (source <> 'import' OR (tex IS NULL AND pdf_public IS NULL AND pdf_private IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS versions_by_type ON versions(type, created_at, version_no);
CREATE TABLE IF NOT EXISTS "current" (
  type TEXT PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES versions(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER IF NOT EXISTS current_guard_ins BEFORE INSERT ON "current"
WHEN NOT EXISTS (SELECT 1 FROM versions v WHERE v.id = NEW.version_id AND v.type = NEW.type AND v.source = 'tex')
BEGIN SELECT RAISE(ABORT, 'current must be a tex version of the same type'); END;
CREATE TRIGGER IF NOT EXISTS current_guard_upd BEFORE UPDATE ON "current"
WHEN NOT EXISTS (SELECT 1 FROM versions v WHERE v.id = NEW.version_id AND v.type = NEW.type AND v.source = 'tex')
BEGIN SELECT RAISE(ABORT, 'current must be a tex version of the same type'); END;
`;

const META_COLUMNS = `
  v.id, v.type, v.version_no, v.note, v.source, v.original_filename, v.created_at,
  v.tex IS NOT NULL AS has_tex,
  v.pdf_public IS NOT NULL AS has_pdf_public,
  v.pdf_private IS NOT NULL AS has_pdf_private,
  c.version_id IS NOT NULL AS is_current
`;
const META_FROM = `versions v LEFT JOIN "current" c ON c.version_id = v.id`;

type MetaRow = {
  id: number;
  type: ResumeType;
  version_no: number;
  note: string;
  source: VersionSource;
  original_filename: string | null;
  created_at: string;
  has_tex: number;
  has_pdf_public: number;
  has_pdf_private: number;
  is_current: number;
};

function toMeta(row: MetaRow): VersionMeta {
  return {
    id: row.id,
    type: row.type,
    versionNo: row.version_no,
    note: row.note,
    source: row.source,
    originalFilename: row.original_filename,
    createdAt: row.created_at,
    hasTex: row.has_tex === 1,
    hasPdfPublic: row.has_pdf_public === 1,
    hasPdfPrivate: row.has_pdf_private === 1,
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

export function resolveDbPath(): string {
  return process.env.RESUME_DB || path.join(process.cwd(), "data", "resume.db");
}

export function openResumeDb(
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

function getMetaById(db: DatabaseSync, id: number): VersionMeta | undefined {
  const row = db
    .prepare(`SELECT ${META_COLUMNS} FROM ${META_FROM} WHERE v.id = ?`)
    .get(id) as MetaRow | undefined;
  return row && toMeta(row);
}

export function hasTexVersion(db: DatabaseSync, type: ResumeType): boolean {
  return (
    db
      .prepare("SELECT 1 FROM versions WHERE type = ? AND source = 'tex' LIMIT 1")
      .get(type) !== undefined
  );
}

export function insertVersion(
  db: DatabaseSync,
  v: {
    type: ResumeType;
    tex: string | null;
    pdfPublic: Uint8Array | null;
    pdfPrivate: Uint8Array | null;
    note: string;
    source: VersionSource;
    originalFilename?: string | null;
    createdAt?: string;
  },
  opts: { makeCurrent: boolean },
): VersionMeta {
  const id = transaction(db, () => {
    const { n } = db
      .prepare(
        "SELECT COALESCE(MAX(version_no), 0) + 1 AS n FROM versions WHERE type = ?",
      )
      .get(v.type) as { n: number };
    const columns = [
      "type",
      "version_no",
      "tex",
      "pdf_public",
      "pdf_private",
      "note",
      "source",
      "original_filename",
    ];
    const values = [
      v.type,
      n,
      v.tex,
      v.pdfPublic,
      v.pdfPrivate,
      v.note,
      v.source,
      v.originalFilename ?? null,
    ];
    if (v.createdAt) {
      columns.push("created_at");
      values.push(v.createdAt);
    }
    const result = db
      .prepare(
        `INSERT INTO versions (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      )
      .run(...values);
    const newId = Number(result.lastInsertRowid);
    if (opts.makeCurrent) {
      db.prepare(
        `INSERT INTO "current" (type, version_id) VALUES (?, ?)
         ON CONFLICT(type) DO UPDATE SET version_id = excluded.version_id, updated_at = CURRENT_TIMESTAMP`,
      ).run(v.type, newId);
    }
    return newId;
  });
  return getMetaById(db, id)!;
}

export function getCurrentMeta(
  db: DatabaseSync,
  type: ResumeType,
): VersionMeta | undefined {
  const row = db
    .prepare(
      `SELECT ${META_COLUMNS} FROM "current" c JOIN versions v ON v.id = c.version_id WHERE c.type = ?`,
    )
    .get(type) as MetaRow | undefined;
  return row && toMeta(row);
}

export function getCurrentTex(
  db: DatabaseSync,
  type: ResumeType,
): string | undefined {
  const row = db
    .prepare(
      `SELECT v.tex FROM "current" c JOIN versions v ON v.id = c.version_id WHERE c.type = ?`,
    )
    .get(type) as { tex: string | null } | undefined;
  return row?.tex ?? undefined;
}

export function getCurrentPublicPdf(
  db: DatabaseSync,
  type: ResumeType,
): { versionNo: number; pdf: Uint8Array } | undefined {
  const row = db
    .prepare(
      `SELECT v.version_no, v.pdf_public FROM "current" c JOIN versions v ON v.id = c.version_id
       WHERE c.type = ? AND v.pdf_public IS NOT NULL`,
    )
    .get(type) as { version_no: number; pdf_public: Uint8Array } | undefined;
  return row && { versionNo: row.version_no, pdf: row.pdf_public };
}

export function listCurrent(db: DatabaseSync): Array<{
  type: ResumeType;
  current: VersionMeta | null;
  versionCount: number;
}> {
  const count = db.prepare("SELECT COUNT(*) AS n FROM versions WHERE type = ?");
  return RESUME_TYPES.map((type) => ({
    type,
    current: getCurrentMeta(db, type) ?? null,
    versionCount: (count.get(type) as { n: number }).n,
  }));
}

export function listVersions(db: DatabaseSync, type: ResumeType): VersionMeta[] {
  const rows = db
    .prepare(
      `SELECT ${META_COLUMNS} FROM ${META_FROM} WHERE v.type = ?
       ORDER BY v.created_at DESC, v.version_no DESC`,
    )
    .all(type) as MetaRow[];
  return rows.map(toMeta);
}

export function getVersion(
  db: DatabaseSync,
  type: ResumeType,
  versionNo: number,
): (VersionMeta & { tex: string | null }) | undefined {
  const row = db
    .prepare(
      `SELECT ${META_COLUMNS}, v.tex FROM ${META_FROM} WHERE v.type = ? AND v.version_no = ?`,
    )
    .get(type, versionNo) as (MetaRow & { tex: string | null }) | undefined;
  return row && { ...toMeta(row), tex: row.tex };
}

export function getVersionPdf(
  db: DatabaseSync,
  type: ResumeType,
  versionNo: number,
  variant: "public" | "private",
): Uint8Array | null | undefined {
  const column = variant === "public" ? "pdf_public" : "pdf_private";
  const row = db
    .prepare(`SELECT ${column} AS pdf FROM versions WHERE type = ? AND version_no = ?`)
    .get(type, versionNo) as { pdf: Uint8Array | null } | undefined;
  return row && row.pdf;
}

export function fillMissingPdfs(
  db: DatabaseSync,
  id: number,
  pub: Uint8Array,
  priv: Uint8Array | null,
): void {
  db.prepare(
    `UPDATE versions SET pdf_public = ?, pdf_private = ?
     WHERE id = ? AND source = 'tex' AND pdf_public IS NULL`,
  ).run(pub, priv, id);
}

export function importPdfsForFilename(
  db: DatabaseSync,
  filename: string,
): Uint8Array[] {
  const rows = db
    .prepare(
      "SELECT pdf_private FROM versions WHERE source = 'import' AND original_filename = ?",
    )
    .all(filename) as { pdf_private: Uint8Array }[];
  return rows.map((row) => row.pdf_private);
}
