import "server-only";
import crypto from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getWriteContentDb } from "@/lib/content-data";
import { getClient, type OAuthClient } from "@/lib/content-store/oauth";
import { oauthError } from "@/lib/oauth/http";
import { ownerHash, sameSecret, sha256 } from "@/lib/owner-session";

// Secrets, PKCE, redirect URI rules and client authentication for the
// built-in OAuth server that lets the Claude app use /mcp.

export { sameSecret, sha256 };

const TOKEN_RE = /^mc[arcs]_[A-Za-z0-9_-]{43}$/;

// mca_ access, mcr_ refresh, mcc_ code, mcs_ client secret.
export function newSecret(prefix: "mca_" | "mcr_" | "mcc_" | "mcs_"): string {
  return `${prefix}${crypto.randomBytes(32).toString("base64url")}`;
}

export function newClientId(): string {
  return `mci_${crypto.randomBytes(16).toString("base64url")}`;
}

export function looksLikeSecret(value: string | null | undefined): value is string {
  return typeof value === "string" && TOKEN_RE.test(value);
}

// Ties every code and token to the configured password hash: unsetting it
// stops them, and a new password ends them for good.
export function ownerTag(): string | null {
  if (!ownerHash()) return null;
  return sha256(process.env.OWNER_PASSWORD_HASH ?? "");
}

export function oauthDb(): DatabaseSync {
  return getWriteContentDb();
}

export function pkceOk(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const computed = crypto.createHash("sha256").update(verifier, "ascii").digest("base64url");
  return sameSecret(computed, challenge);
}

const CLAUDE_CALLBACKS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
];

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

// Claude's own callbacks, or a loopback address for local clients.
export function allowedRedirectUri(raw: string): boolean {
  if (raw.length > 2000) return false;
  const url = parseUrl(raw);
  // A bare trailing "#" leaves url.hash empty, hence the raw check too.
  if (!url || url.hash || raw.includes("#") || url.username || url.password) return false;
  if (CLAUDE_CALLBACKS.includes(raw)) return true;
  return url.protocol === "http:" && LOOPBACK_HOSTS.includes(url.hostname);
}

// Exact match, except a loopback URI may differ in port (RFC 8252 7.3).
export function redirectMatches(requested: string, registered: string): boolean {
  if (requested === registered) return true;
  const a = parseUrl(requested);
  const b = parseUrl(registered);
  if (!a || !b) return false;
  if (!LOOPBACK_HOSTS.includes(a.hostname) || !LOOPBACK_HOSTS.includes(b.hostname)) return false;
  return (
    a.protocol === b.protocol &&
    a.hostname === b.hostname &&
    a.pathname === b.pathname &&
    a.search === b.search
  );
}

function basicCredentials(headers: Headers): { id: string; secret: string } | null | "bad" {
  const match = /^Basic ([A-Za-z0-9+/=]+)$/i.exec(headers.get("authorization") ?? "");
  if (!match) return headers.get("authorization") ? "bad" : null;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  if (colon < 0) return "bad";
  // RFC 6749 2.3.1: the id and secret are form-encoded before base64.
  try {
    return {
      id: decodeURIComponent(decoded.slice(0, colon)),
      secret: decodeURIComponent(decoded.slice(colon + 1)),
    };
  } catch {
    return "bad";
  }
}

// The registered client making a token or revoke request, or the error.
export function authenticateClient(
  headers: Headers,
  form: URLSearchParams,
): { client: OAuthClient } | Response {
  const basic = basicCredentials(headers);
  const usedBasic = basic !== null;
  const fail = (description: string) =>
    oauthError(
      401,
      "invalid_client",
      description,
      usedBasic ? { "www-authenticate": 'Basic realm="oauth"' } : {},
    );
  if (basic === "bad") return fail("The Authorization header isn't valid.");

  const formId = form.get("client_id");
  if (basic && formId && formId !== basic.id) return fail("The client ids don't match.");
  const clientId = basic?.id || formId;
  if (!clientId || clientId.length > 100) return fail("The client_id is missing.");

  const client = getClient(oauthDb(), clientId);
  if (!client) return fail("This client isn't registered here.");
  if (client.secretHash) {
    const secret = basic?.secret || form.get("client_secret");
    if (!secret || !sameSecret(sha256(secret), client.secretHash)) {
      return fail("The client secret is missing or wrong.");
    }
  }
  return { client };
}
