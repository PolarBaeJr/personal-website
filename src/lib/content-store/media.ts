// The photo library and one-time upload links, in the content DB. Builtins
// and relative .ts imports only, so plain node scripts can use it too.
// Every time comes from SQLite (UTC, "YYYY-MM-DD HH:MM:SS"); link tokens
// are stored as sha256 hex only.
import type { DatabaseSync } from "node:sqlite";
import { transaction } from "./db.ts";

export const LINK_MINUTES = 15;
export const MAX_OPEN_LINKS = 5;

export type MediaRow = {
  file: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  created_at: string;
};

export function insertMedia(
  db: DatabaseSync,
  m: { file: string; width: number; height: number; bytes: number; mtimeSeconds?: number },
): void {
  if (m.mtimeSeconds === undefined) {
    db.prepare("INSERT OR IGNORE INTO media (file, width, height, bytes) VALUES (?, ?, ?, ?)").run(
      m.file,
      m.width,
      m.height,
      m.bytes,
    );
    return;
  }
  db.prepare(
    `INSERT OR IGNORE INTO media (file, width, height, bytes, created_at)
     VALUES (?, ?, ?, ?, datetime(?, 'unixepoch'))`,
  ).run(m.file, m.width, m.height, m.bytes, Math.floor(m.mtimeSeconds));
}

export function listMediaRows(db: DatabaseSync): MediaRow[] {
  return db
    .prepare(
      "SELECT file, width, height, bytes, created_at FROM media ORDER BY created_at DESC, file",
    )
    .all() as MediaRow[];
}

// Whether any stored version (current or not) of any section mentions the
// file. Restoring such a version would need the file.
export function mediaInHistory(db: DatabaseSync, file: string): boolean {
  return (
    db.prepare("SELECT 1 FROM content_versions WHERE instr(data, ?) > 0 LIMIT 1").get(file) !==
    undefined
  );
}

// Drops the row unless some version mentions the file. The caller removes
// the file only when this returns true.
export function deleteMediaRow(db: DatabaseSync, file: string): boolean {
  return transaction(db, () => {
    if (mediaInHistory(db, file)) return false;
    db.prepare("DELETE FROM media WHERE file = ?").run(file);
    return true;
  });
}

// ---- Upload links ----

// Links that are neither used nor expired. Also drops rows nothing needs.
export function openLinkCount(db: DatabaseSync): number {
  db.prepare("DELETE FROM upload_links WHERE expires_at < datetime('now', '-7 days')").run();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM upload_links
       WHERE used_at IS NULL AND expires_at > datetime('now')`,
    )
    .get() as { n: number };
  return row.n;
}

export function createLink(db: DatabaseSync, id: string, tokenHash: string, note: string): void {
  db.prepare(
    `INSERT INTO upload_links (id, token_hash, note, expires_at)
     VALUES (?, ?, ?, datetime('now', '+${LINK_MINUTES} minutes'))`,
  ).run(id, tokenHash, note);
}

// The note of a link that can still be used, or undefined.
export function openLinkNote(db: DatabaseSync, tokenHash: string): string | undefined {
  const row = db
    .prepare(
      `SELECT note FROM upload_links
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`,
    )
    .get(tokenHash) as { note: string } | undefined;
  return row?.note;
}

// Uses the link up and stores the photo on it, in one step, so a link can
// only ever take one photo. False if it was used or expired meanwhile.
export function completeLink(
  db: DatabaseSync,
  tokenHash: string,
  photo: { src: string; width: number; height: number },
): boolean {
  const row = db
    .prepare(
      `UPDATE upload_links SET used_at = datetime('now'), src = ?, width = ?, height = ?
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')
       RETURNING id`,
    )
    .get(photo.src, photo.width, photo.height, tokenHash);
  return row !== undefined;
}

export type LinkStatus =
  | { status: "waiting" }
  | { status: "done"; src: string; width: number; height: number }
  | { status: "expired" };

export function linkStatus(db: DatabaseSync, id: string): LinkStatus | undefined {
  const row = db
    .prepare(
      `SELECT src, width, height, expires_at > datetime('now') AS open
       FROM upload_links WHERE id = ?`,
    )
    .get(id) as
    | { src: string | null; width: number | null; height: number | null; open: number }
    | undefined;
  if (!row) return undefined;
  if (row.src) {
    return { status: "done", src: row.src, width: row.width ?? 0, height: row.height ?? 0 };
  }
  return row.open === 1 ? { status: "waiting" } : { status: "expired" };
}

export function recordLinkFailure(db: DatabaseSync, ip: string): void {
  db.prepare("INSERT INTO upload_link_failures (ip) VALUES (?)").run(ip);
}

// Failed tries from this IP in the last 15 minutes. Also drops old rows.
export function linkFailures(db: DatabaseSync, ip: string): number {
  db.prepare("DELETE FROM upload_link_failures WHERE at < datetime('now', '-1 day')").run();
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM upload_link_failures
       WHERE ip = ? AND at > datetime('now', '-15 minutes')`,
    )
    .get(ip) as { n: number };
  return row.n;
}
