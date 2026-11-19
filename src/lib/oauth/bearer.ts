import "server-only";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { findAccessToken } from "@/lib/content-store/oauth";
import { looksLikeSecret, oauthDb, ownerTag, sha256 } from "@/lib/oauth/core";
import { CORS } from "@/lib/oauth/http";
import { mcpResourceUrl, protectedResourceMetadataUrl } from "@/lib/site-url";

// The access token on an /mcp request. The 401's WWW-Authenticate header
// tells the client where to find the OAuth metadata.
export function authenticateMcp(req: Request): { authInfo: AuthInfo } | Response {
  const meta = protectedResourceMetadataUrl();
  const unauthorized = (challenge: string) =>
    Response.json(
      { error: "invalid_token" },
      {
        status: 401,
        headers: { ...CORS, "cache-control": "no-store", "www-authenticate": challenge },
      },
    );

  const match = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "");
  if (!match) return unauthorized(`Bearer resource_metadata="${meta}"`);

  const invalid = () =>
    unauthorized(
      `Bearer error="invalid_token", error_description="The access token is missing, expired or revoked", resource_metadata="${meta}"`,
    );
  const token = match[1];
  const tag = ownerTag();
  if (!looksLikeSecret(token) || !token.startsWith("mca_") || !tag) return invalid();

  try {
    const row = findAccessToken(oauthDb(), sha256(token), tag);
    if (!row) return invalid();
    return {
      authInfo: {
        token,
        clientId: row.client_id,
        scopes: [],
        expiresAt: row.exp,
        resource: new URL(mcpResourceUrl()),
        extra: { tokenId: row.id },
      },
    };
  } catch (e) {
    console.error(`mcp auth: ${(e as Error).message}`);
    return Response.json(
      { error: "internal" },
      { status: 500, headers: { ...CORS, "cache-control": "no-store" } },
    );
  }
}
