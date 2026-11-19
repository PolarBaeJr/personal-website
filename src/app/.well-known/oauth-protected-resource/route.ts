import { connection } from "next/server";
import { oauthJson, preflight } from "@/lib/oauth/http";
import { mcpResourceUrl, siteOrigin } from "@/lib/site-url";

// OAuth protected resource metadata (RFC 9728) for /mcp. Also served at the
// path-inserted /.well-known/oauth-protected-resource/mcp, which clients try
// first. connection() keeps it request-time, so SITE_URL isn't baked in.
export async function GET() {
  await connection();
  return oauthJson({
    resource: mcpResourceUrl(),
    authorization_servers: [siteOrigin()],
    bearer_methods_supported: ["header"],
    resource_name: "Site editor",
  });
}

export function OPTIONS() {
  return preflight("GET, OPTIONS");
}
