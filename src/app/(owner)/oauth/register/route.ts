import { clientIpFrom } from "@/lib/client-ip";
import {
  insertClient,
  MAX_CLIENTS,
  MAX_REG_PER_HOUR,
  MAX_REG_PER_IP_HOUR,
  pruneOAuth,
  registrationLoad,
} from "@/lib/content-store/oauth";
import {
  allowedRedirectUri,
  newClientId,
  newSecret,
  oauthDb,
  ownerTag,
  sha256,
} from "@/lib/oauth/core";
import { oauthError, oauthJson, preflight } from "@/lib/oauth/http";
import { readBodyLimited } from "@/lib/resume-api";

// Dynamic client registration (RFC 7591). Open to anyone, but a client can
// do nothing until the owner, signed in, allows it on the consent page.
// Public clients by default; asking for client_secret_post or
// client_secret_basic gets a secret, stored only as a hash.

const CONFIDENTIAL = ["client_secret_post", "client_secret_basic"];

function cleanName(value: unknown): string {
  if (typeof value !== "string") return "Unnamed app";
  const name = value.replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 100);
  return name || "Unnamed app";
}

export async function POST(req: Request) {
  if (!ownerTag()) return oauthError(403, "access_denied", "Sign-in is turned off on this site");

  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") {
    return oauthError(400, "invalid_client_metadata", "Send the client metadata as JSON.");
  }
  const body = await readBodyLimited(req, 16 * 1024);
  if (body instanceof Response) {
    return oauthError(400, "invalid_client_metadata", "The client metadata is too large.");
  }
  let meta: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    meta = parsed as Record<string, unknown>;
  } catch {
    return oauthError(400, "invalid_client_metadata", "The client metadata isn't valid JSON.");
  }

  const uris = meta.redirect_uris;
  if (
    !Array.isArray(uris) ||
    uris.length < 1 ||
    uris.length > 5 ||
    !uris.every((uri) => typeof uri === "string" && allowedRedirectUri(uri))
  ) {
    return oauthError(
      400,
      "invalid_redirect_uri",
      "redirect_uris must list 1 to 5 of: https://claude.ai/api/mcp/auth_callback, https://claude.com/api/mcp/auth_callback, or an http://localhost, http://127.0.0.1 or http://[::1] address.",
    );
  }
  const grants = meta.grant_types;
  if (
    grants !== undefined &&
    (!Array.isArray(grants) || !grants.includes("authorization_code"))
  ) {
    return oauthError(400, "invalid_client_metadata", "grant_types must include authorization_code.");
  }
  const responses = meta.response_types;
  if (
    responses !== undefined &&
    (!Array.isArray(responses) || responses.length !== 1 || responses[0] !== "code")
  ) {
    return oauthError(400, "invalid_client_metadata", 'response_types must be ["code"].');
  }
  const requested = meta.token_endpoint_auth_method;
  const authMethod =
    typeof requested === "string" && CONFIDENTIAL.includes(requested) ? requested : "none";
  const name = cleanName(meta.client_name);

  try {
    const db = oauthDb();
    pruneOAuth(db);
    const ip = clientIpFrom(req.headers);
    const load = registrationLoad(db, ip);
    if (
      load.ip >= MAX_REG_PER_IP_HOUR ||
      load.hour >= MAX_REG_PER_HOUR ||
      load.total >= MAX_CLIENTS
    ) {
      return oauthJson(
        {
          error: "temporarily_unavailable",
          error_description: "Too many app registrations. Try again later.",
        },
        429,
      );
    }
    const id = newClientId();
    const secret = authMethod === "none" ? null : newSecret("mcs_");
    const { issuedAt } = insertClient(db, {
      id,
      name,
      redirectUris: uris as string[],
      authMethod,
      secretHash: secret && sha256(secret),
      ip,
    });
    return oauthJson(
      {
        client_id: id,
        client_id_issued_at: issuedAt,
        client_name: name,
        redirect_uris: uris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: authMethod,
        ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
      },
      201,
    );
  } catch (e) {
    console.error(`oauth register: ${(e as Error).message}`);
    return oauthError(500, "server_error", "Something went wrong.");
  }
}

export function OPTIONS() {
  return preflight("POST, OPTIONS");
}
