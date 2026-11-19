import { connection } from "next/server";
import { oauthJson, preflight } from "@/lib/oauth/http";
import { siteOrigin } from "@/lib/site-url";

// OAuth authorization server metadata (RFC 8414). Public clients with PKCE
// S256 are the default; clients that register for a secret must send it.
export async function GET() {
  await connection();
  const origin = siteOrigin();
  const authMethods = ["none", "client_secret_post", "client_secret_basic"];
  return oauthJson({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    revocation_endpoint: `${origin}/oauth/revoke`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: authMethods,
    revocation_endpoint_auth_methods_supported: authMethods,
  });
}

export function OPTIONS() {
  return preflight("GET, OPTIONS");
}
