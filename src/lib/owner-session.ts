import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import { getWriteContentDb } from "@/lib/content-data";
import { resolveContentDbPath } from "@/lib/content-store/db";
import { findSession, SESSION_DAYS } from "@/lib/content-store/owner";
import { parseOwnerHash, type OwnerHash } from "@/lib/owner-password";

// Session lookup without next/headers, so the proxy can use it too.

// __Host- makes the browser insist on Secure, Path=/ and no Domain. Plain
// http in dev can't carry a Secure cookie, so dev uses a plain name.
const SECURE = process.env.NODE_ENV === "production";
export const COOKIE_NAME = SECURE ? "__Host-owner" : "owner";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: SECURE,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
} as const;

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

let loggedBadHash = false;

// The configured hash, or null when sign-in is off (unset or malformed).
// Unsetting OWNER_PASSWORD_HASH and restarting is the kill switch.
export function ownerHash(): OwnerHash | null {
  const value = process.env.OWNER_PASSWORD_HASH;
  if (!value) return null;
  const parsed = parseOwnerHash(value);
  if (!parsed && !loggedBadHash) {
    loggedBadHash = true;
    console.error("owner: OWNER_PASSWORD_HASH is malformed; sign-in is off");
  }
  return parsed;
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function sameSecret(a: string, b: string): boolean {
  return crypto.timingSafeEqual(
    crypto.createHash("sha256").update(a, "utf8").digest(),
    crypto.createHash("sha256").update(b, "utf8").digest(),
  );
}

// The session behind a cookie value, or null. Never creates the DB; any
// failure (no DB yet, a table missing) counts as signed out.
export function sessionForToken(
  token: string | undefined,
): { csrf: string; refreshed: boolean } | null {
  if (!token || !TOKEN_RE.test(token) || !ownerHash()) return null;
  if (!fs.existsSync(resolveContentDbPath())) return null;
  try {
    return findSession(getWriteContentDb(), sha256(token)) ?? null;
  } catch (e) {
    console.error(`owner session: ${(e as Error).message}`);
    return null;
  }
}
