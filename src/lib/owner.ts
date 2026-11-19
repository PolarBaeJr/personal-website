import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { clientIpFrom } from "@/lib/client-ip";
import { getWriteContentDb } from "@/lib/content-data";
import {
  createSession,
  deleteSession,
  failedSignIns,
  recordFailedSignIn,
} from "@/lib/content-store/owner";
import { verifyOwnerPassword } from "@/lib/owner-password";
import {
  COOKIE_NAME,
  COOKIE_OPTIONS,
  ownerHash,
  sameSecret,
  sessionForToken,
  sha256,
} from "@/lib/owner-session";

// The site has one editor, the owner. Reading the session reads cookies(),
// so call these outside "use cache" (inside Suspense on public pages) and
// pass the result into cached getters.

export type Owner = { csrf: string };

const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_PER_HOUR = 20;
const FAIL_DELAY_MS = 800;

export function signInEnabled(): boolean {
  return ownerHash() !== null;
}

// Once per request, however many components ask.
export const getOwner = cache(async (): Promise<Owner | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = sessionForToken(token);
  return session && { csrf: session.csrf };
});

// For Server Actions: the owner, if signed in and the form's CSRF token
// matches the session's.
export async function checkOwner(csrf: unknown): Promise<Owner | null> {
  const owner = await getOwner();
  if (!owner || typeof csrf !== "string" || !sameSecret(csrf, owner.csrf)) return null;
  return owner;
}

// For admin pages and route handlers: anyone else gets a 404.
export async function requireOwner(csrf?: unknown): Promise<Owner> {
  const owner = csrf === undefined ? await getOwner() : await checkOwner(csrf);
  if (!owner) notFound();
  return owner;
}

async function clientIp(): Promise<string> {
  return clientIpFrom(await headers());
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signIn(password: string): Promise<SignInResult> {
  const stored = ownerHash();
  if (!stored) return { ok: false, error: "Sign-in isn't set up on this server." };

  const db = getWriteContentDb();
  const ip = await clientIp();
  const fails = failedSignIns(db, ip);
  if (fails.ip >= MAX_FAILS_PER_IP) {
    await wait(FAIL_DELAY_MS);
    return { ok: false, error: "Too many wrong passwords. Wait 15 minutes, then try again." };
  }
  if (fails.total >= MAX_FAILS_PER_HOUR) {
    await wait(FAIL_DELAY_MS);
    return {
      ok: false,
      error: "Sign-in is paused after too many wrong passwords. Try again in an hour.",
    };
  }

  if (!password || !(await verifyOwnerPassword(password, stored))) {
    recordFailedSignIn(db, ip);
    await wait(FAIL_DELAY_MS);
    return { ok: false, error: "That password isn't right." };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  createSession(db, sha256(token), crypto.randomBytes(32).toString("base64url"));
  (await cookies()).set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      deleteSession(getWriteContentDb(), sha256(token));
    } catch (e) {
      console.error(`owner sign out: ${(e as Error).message}`);
    }
  }
  // Same attributes as when set, or the browser ignores a __Host- removal.
  store.set(COOKIE_NAME, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}
