import "server-only";
import { getWriteContentDb } from "@/lib/content-data";
import { linkFailures, openLinkNote, recordLinkFailure } from "@/lib/content-store/media";
import { sha256 } from "@/lib/owner-session";

// One-time upload links (/upload/<token>). The token is the only
// authorization, so a bad one is counted against the IP, and every bad,
// used or expired link gets the same answer.

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const MAX_FAILS_PER_IP = 20;

export type LinkCheck =
  | { kind: "open"; hash: string; note: string }
  | { kind: "closed" }
  | { kind: "throttled" };

export function checkUploadLink(token: string, ip: string): LinkCheck {
  const db = getWriteContentDb();
  if (linkFailures(db, ip) >= MAX_FAILS_PER_IP) return { kind: "throttled" };
  const hash = TOKEN_RE.test(token) ? sha256(token) : null;
  const note = hash ? openLinkNote(db, hash) : undefined;
  if (hash && note !== undefined) return { kind: "open", hash, note };
  recordLinkFailure(db, ip);
  return { kind: "closed" };
}
