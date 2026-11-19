// Owner sessions and failed sign-in attempts, in the content DB. Builtins
// and relative .ts imports only, so plain node scripts can use it too.
// Every time comes from SQLite (UTC, "YYYY-MM-DD HH:MM:SS").
import type { DatabaseSync } from "node:sqlite";

export const SESSION_DAYS = 14;

export function createSession(db: DatabaseSync, idHash: string, csrf: string): void {
  db.prepare(
    `INSERT INTO owner_sessions (id_hash, csrf, expires_at)
     VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`,
  ).run(idHash, csrf);
}

// A live session's CSRF token, or undefined. Sliding expiry: a session seen
// more than an hour ago gets another SESSION_DAYS (at most one write an hour).
export function findSession(
  db: DatabaseSync,
  idHash: string,
): { csrf: string; refreshed: boolean } | undefined {
  const row = db
    .prepare(
      `SELECT csrf, last_seen_at <= datetime('now', '-1 hour') AS stale
       FROM owner_sessions WHERE id_hash = ? AND expires_at > datetime('now')`,
    )
    .get(idHash) as { csrf: string; stale: number } | undefined;
  if (!row) return undefined;
  if (row.stale === 1) {
    db.prepare(
      `UPDATE owner_sessions SET last_seen_at = datetime('now'),
         expires_at = datetime('now', '+${SESSION_DAYS} days') WHERE id_hash = ?`,
    ).run(idHash);
  }
  return { csrf: row.csrf, refreshed: row.stale === 1 };
}

export function deleteSession(db: DatabaseSync, idHash: string): void {
  db.prepare("DELETE FROM owner_sessions WHERE id_hash = ?").run(idHash);
}

// Signs out every device. Returns how many sessions there were.
export function deleteAllSessions(db: DatabaseSync): number {
  return Number(db.prepare("DELETE FROM owner_sessions").run().changes);
}

export function recordFailedSignIn(db: DatabaseSync, ip: string): void {
  db.prepare("INSERT INTO login_attempts (ip) VALUES (?)").run(ip);
}

// Failures from this IP in the last 15 minutes, and from anywhere in the
// last hour. Also drops rows nothing reads any more.
export function failedSignIns(
  db: DatabaseSync,
  ip: string,
): { ip: number; total: number } {
  db.prepare("DELETE FROM login_attempts WHERE at < datetime('now', '-1 day')").run();
  db.prepare("DELETE FROM owner_sessions WHERE expires_at <= datetime('now')").run();
  const row = db
    .prepare(
      `SELECT
         COUNT(CASE WHEN ip = ? AND at > datetime('now', '-15 minutes') THEN 1 END) AS ip,
         COUNT(CASE WHEN at > datetime('now', '-1 hour') THEN 1 END) AS total
       FROM login_attempts`,
    )
    .get(ip) as { ip: number; total: number };
  return { ip: row.ip, total: row.total };
}
