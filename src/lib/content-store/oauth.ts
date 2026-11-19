// OAuth clients, authorization codes and tokens for connected apps, in the
// content DB. Builtins and relative .ts imports only, so plain node scripts
// can use it too. Callers pass sha256 hex hashes; no secret is stored.
// Every time comes from SQLite (UTC, "YYYY-MM-DD HH:MM:SS").
import type { DatabaseSync } from "node:sqlite";
import { transaction } from "./db.ts";

export const ACCESS_SECONDS = 3600;
export const REFRESH_DAYS = 30;
export const CODE_SECONDS = 60;
export const MAX_CLIENTS = 100;
export const MAX_REG_PER_IP_HOUR = 10;
export const MAX_REG_PER_HOUR = 30;

export type OAuthClient = {
  id: string;
  name: string;
  redirectUris: string[];
  authMethod: string;
  secretHash: string | null;
};

export type CodeRow = {
  hash: string;
  client_id: string;
  redirect_uri: string;
  challenge: string;
  resource: string | null;
  owner_tag: string;
};

// Drops old codes, dead grants and clients nobody connected within a day.
export function pruneOAuth(db: DatabaseSync): void {
  db.prepare("DELETE FROM oauth_codes WHERE created_at < datetime('now', '-1 day')").run();
  db.prepare(
    `DELETE FROM oauth_tokens
     WHERE (revoked = 1 OR refresh_expires_at <= datetime('now'))
       AND created_at < datetime('now', '-1 day')`,
  ).run();
  db.prepare(
    `DELETE FROM oauth_clients AS c
     WHERE c.created_at < datetime('now', '-1 day')
       AND NOT EXISTS (SELECT 1 FROM oauth_tokens t WHERE t.client_id = c.id
         AND t.revoked = 0 AND t.refresh_expires_at > datetime('now'))`,
  ).run();
}

// Registrations from this IP and from anywhere in the last hour, and the
// number of clients in total.
export function registrationLoad(
  db: DatabaseSync,
  ip: string,
): { ip: number; hour: number; total: number } {
  const row = db
    .prepare(
      `SELECT
         COUNT(CASE WHEN created_ip = ? AND created_at > datetime('now', '-1 hour') THEN 1 END) AS ip,
         COUNT(CASE WHEN created_at > datetime('now', '-1 hour') THEN 1 END) AS hour,
         COUNT(*) AS total
       FROM oauth_clients`,
    )
    .get(ip) as { ip: number; hour: number; total: number };
  return { ip: row.ip, hour: row.hour, total: row.total };
}

export function insertClient(
  db: DatabaseSync,
  c: {
    id: string;
    name: string;
    redirectUris: string[];
    authMethod: string;
    secretHash: string | null;
    ip: string;
  },
): { issuedAt: number } {
  db.prepare(
    `INSERT INTO oauth_clients (id, name, redirect_uris, auth_method, secret_hash, created_ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(c.id, c.name, JSON.stringify(c.redirectUris), c.authMethod, c.secretHash, c.ip);
  const row = db
    .prepare(
      "SELECT CAST(strftime('%s', created_at) AS INTEGER) AS issued_at FROM oauth_clients WHERE id = ?",
    )
    .get(c.id) as { issued_at: number };
  return { issuedAt: row.issued_at };
}

export function getClient(db: DatabaseSync, id: string): OAuthClient | undefined {
  const row = db
    .prepare(
      "SELECT id, name, redirect_uris, auth_method, secret_hash FROM oauth_clients WHERE id = ?",
    )
    .get(id) as
    | {
        id: string;
        name: string;
        redirect_uris: string;
        auth_method: string;
        secret_hash: string | null;
      }
    | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    redirectUris: JSON.parse(row.redirect_uris) as string[],
    authMethod: row.auth_method,
    secretHash: row.secret_hash,
  };
}

export function insertCode(
  db: DatabaseSync,
  c: {
    hash: string;
    clientId: string;
    redirectUri: string;
    challenge: string;
    resource: string | null;
    ownerTag: string;
  },
): void {
  db.prepare(
    `INSERT INTO oauth_codes (hash, client_id, redirect_uri, challenge, resource, owner_tag, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+${CODE_SECONDS} seconds'))`,
  ).run(c.hash, c.clientId, c.redirectUri, c.challenge, c.resource, c.ownerTag);
}

export type ConsumeResult =
  | { kind: "missing" }
  | { kind: "reused" }
  | { kind: "ok"; row: CodeRow };

// A code works once. Any attempt burns it, a wrong verifier included; a
// second attempt also revokes the grant the first one issued.
export function consumeCode(db: DatabaseSync, hash: string): ConsumeResult {
  return transaction(db, (): ConsumeResult => {
    const row = db
      .prepare(
        `SELECT hash, client_id, redirect_uri, challenge, resource, owner_tag, used, token_id,
           expires_at > datetime('now') AS live
         FROM oauth_codes WHERE hash = ?`,
      )
      .get(hash) as (CodeRow & { used: number; token_id: number | null; live: number }) | undefined;
    if (!row) return { kind: "missing" };
    if (row.used === 1) {
      if (row.token_id !== null) {
        db.prepare("UPDATE oauth_tokens SET revoked = 1 WHERE id = ?").run(row.token_id);
      }
      return { kind: "reused" };
    }
    db.prepare("UPDATE oauth_codes SET used = 1 WHERE hash = ?").run(hash);
    if (row.live !== 1) return { kind: "missing" };
    return {
      kind: "ok",
      row: {
        hash: row.hash,
        client_id: row.client_id,
        redirect_uri: row.redirect_uri,
        challenge: row.challenge,
        resource: row.resource,
        owner_tag: row.owner_tag,
      },
    };
  });
}

export function insertToken(
  db: DatabaseSync,
  t: { clientId: string; accessHash: string; refreshHash: string; ownerTag: string },
): number {
  const result = db
    .prepare(
      `INSERT INTO oauth_tokens (client_id, access_hash, refresh_hash, owner_tag, expires_at, refresh_expires_at)
       VALUES (?, ?, ?, ?, datetime('now', '+${ACCESS_SECONDS} seconds'), datetime('now', '+${REFRESH_DAYS} days'))`,
    )
    .run(t.clientId, t.accessHash, t.refreshHash, t.ownerTag);
  return Number(result.lastInsertRowid);
}

export function linkCode(db: DatabaseSync, codeHash: string, tokenId: number): void {
  db.prepare("UPDATE oauth_codes SET token_id = ? WHERE hash = ?").run(tokenId, codeHash);
}

// A live access token's grant. Marks it used at most once a minute.
export function findAccessToken(
  db: DatabaseSync,
  accessHash: string,
  ownerTag: string,
): { id: number; client_id: string; exp: number } | undefined {
  const row = db
    .prepare(
      `SELECT id, client_id, CAST(strftime('%s', expires_at) AS INTEGER) AS exp,
         last_used_at IS NULL OR last_used_at <= datetime('now', '-1 minute') AS stale
       FROM oauth_tokens
       WHERE access_hash = ? AND revoked = 0 AND owner_tag = ? AND expires_at > datetime('now')`,
    )
    .get(accessHash, ownerTag) as
    | { id: number; client_id: string; exp: number; stale: number }
    | undefined;
  if (!row) return undefined;
  if (row.stale === 1) {
    db.prepare("UPDATE oauth_tokens SET last_used_at = datetime('now') WHERE id = ?").run(row.id);
  }
  return { id: row.id, client_id: row.client_id, exp: row.exp };
}

// Swaps both hashes in one conditional UPDATE, so of two refreshes with the
// same token only one can win. The old pair stops working at once.
export function rotateRefresh(
  db: DatabaseSync,
  r: {
    refreshHash: string;
    clientId: string;
    ownerTag: string;
    newAccess: string;
    newRefresh: string;
  },
): boolean {
  const result = db
    .prepare(
      `UPDATE oauth_tokens SET access_hash = ?, refresh_hash = ?,
         expires_at = datetime('now', '+${ACCESS_SECONDS} seconds'),
         refresh_expires_at = datetime('now', '+${REFRESH_DAYS} days'),
         last_used_at = datetime('now')
       WHERE refresh_hash = ? AND client_id = ? AND revoked = 0 AND owner_tag = ?
         AND refresh_expires_at > datetime('now')`,
    )
    .run(r.newAccess, r.newRefresh, r.refreshHash, r.clientId, r.ownerTag);
  return Number(result.changes) === 1;
}

export function revokeByHash(db: DatabaseSync, hash: string, clientId: string): void {
  db.prepare(
    "UPDATE oauth_tokens SET revoked = 1 WHERE (access_hash = ? OR refresh_hash = ?) AND client_id = ?",
  ).run(hash, hash, clientId);
}

// Disconnects one app. Returns how many live grants it had.
export function revokeClient(db: DatabaseSync, clientId: string): number {
  return transaction(db, () => {
    const count = Number(
      db
        .prepare("UPDATE oauth_tokens SET revoked = 1 WHERE client_id = ? AND revoked = 0")
        .run(clientId).changes,
    );
    db.prepare("DELETE FROM oauth_codes WHERE client_id = ? AND used = 0").run(clientId);
    return count;
  });
}

export type ConnectedAppRow = {
  id: string;
  name: string;
  redirect_uris: string;
  connected_at: string;
  last_used_at: string | null;
  grants: number;
};

// Apps with at least one live grant, most recently used first.
export function listConnectedApps(db: DatabaseSync): ConnectedAppRow[] {
  return db
    .prepare(
      `SELECT c.id, c.name, c.redirect_uris, MIN(t.created_at) AS connected_at,
         MAX(t.last_used_at) AS last_used_at, COUNT(*) AS grants
       FROM oauth_clients c JOIN oauth_tokens t ON t.client_id = c.id
       WHERE t.revoked = 0 AND t.refresh_expires_at > datetime('now')
       GROUP BY c.id
       ORDER BY last_used_at IS NULL, last_used_at DESC, connected_at DESC`,
    )
    .all() as ConnectedAppRow[];
}

// Disconnects every app. Returns how many live grants there were.
export function deleteAllOAuthGrants(db: DatabaseSync): number {
  return transaction(db, () => {
    const { n } = db
      .prepare(
        "SELECT COUNT(*) AS n FROM oauth_tokens WHERE revoked = 0 AND refresh_expires_at > datetime('now')",
      )
      .get() as { n: number };
    db.prepare("DELETE FROM oauth_codes").run();
    db.prepare("DELETE FROM oauth_tokens").run();
    return n;
  });
}
