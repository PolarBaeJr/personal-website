import {
  ACCESS_SECONDS,
  consumeCode,
  insertToken,
  linkCode,
  rotateRefresh,
} from "@/lib/content-store/oauth";
import {
  authenticateClient,
  looksLikeSecret,
  newSecret,
  oauthDb,
  ownerTag,
  pkceOk,
  sha256,
} from "@/lib/oauth/core";
import { oauthError, oauthJson, preflight, readForm } from "@/lib/oauth/http";
import { isOurResource } from "@/lib/site-url";

// Token endpoint: authorization_code (PKCE S256 required) and
// refresh_token (rotated on every use). Never log tokens or bodies.

function tokens(access: string, refresh: string): Response {
  return oauthJson({
    access_token: access,
    token_type: "Bearer",
    expires_in: ACCESS_SECONDS,
    refresh_token: refresh,
  });
}

const badGrant = (description: string) => oauthError(400, "invalid_grant", description);

export async function POST(req: Request) {
  const tag = ownerTag();
  if (!tag) return badGrant("Sign-in is turned off on this site");

  const form = await readForm(req);
  if (form instanceof Response) return form;

  try {
    const auth = authenticateClient(req.headers, form);
    if (auth instanceof Response) return auth;
    const { client } = auth;
    const db = oauthDb();

    const resource = form.get("resource");
    if (resource !== null && !isOurResource(resource)) {
      return oauthError(400, "invalid_target", "The resource isn't this site's MCP server.");
    }

    const grantType = form.get("grant_type");
    if (grantType === "authorization_code") {
      const code = form.get("code");
      const verifier = form.get("code_verifier");
      const redirectUri = form.get("redirect_uri");
      if (!code || !verifier || !redirectUri) {
        return oauthError(400, "invalid_request", "code, code_verifier and redirect_uri are required.");
      }
      if (!looksLikeSecret(code) || !code.startsWith("mcc_")) return badGrant("The code isn't valid.");
      const codeHash = sha256(code);
      const used = consumeCode(db, codeHash);
      if (used.kind !== "ok") return badGrant("The code is invalid, expired or already used.");
      const row = used.row;
      if (
        row.client_id !== client.id ||
        row.redirect_uri !== redirectUri ||
        row.owner_tag !== tag ||
        !pkceOk(verifier, row.challenge)
      ) {
        return badGrant("The code doesn't match this request.");
      }
      const access = newSecret("mca_");
      const refresh = newSecret("mcr_");
      const tokenId = insertToken(db, {
        clientId: client.id,
        accessHash: sha256(access),
        refreshHash: sha256(refresh),
        ownerTag: tag,
      });
      linkCode(db, codeHash, tokenId);
      return tokens(access, refresh);
    }

    if (grantType === "refresh_token") {
      const refreshToken = form.get("refresh_token");
      if (!refreshToken) return oauthError(400, "invalid_request", "refresh_token is required.");
      if (!looksLikeSecret(refreshToken) || !refreshToken.startsWith("mcr_")) {
        return badGrant("The refresh token is invalid, expired or revoked.");
      }
      const access = newSecret("mca_");
      const refresh = newSecret("mcr_");
      const rotated = rotateRefresh(db, {
        refreshHash: sha256(refreshToken),
        clientId: client.id,
        ownerTag: tag,
        newAccess: sha256(access),
        newRefresh: sha256(refresh),
      });
      if (!rotated) return badGrant("The refresh token is invalid, expired or revoked.");
      return tokens(access, refresh);
    }

    return oauthError(
      400,
      "unsupported_grant_type",
      "Only authorization_code and refresh_token are supported.",
    );
  } catch (e) {
    console.error(`oauth token: ${(e as Error).message}`);
    return oauthError(500, "server_error", "Something went wrong.");
  }
}

export function OPTIONS() {
  return preflight("POST, OPTIONS");
}
