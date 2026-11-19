import { revokeByHash } from "@/lib/content-store/oauth";
import { authenticateClient, looksLikeSecret, oauthDb, ownerTag, sha256 } from "@/lib/oauth/core";
import { oauthError, oauthJson, preflight, readForm } from "@/lib/oauth/http";

// Token revocation (RFC 7009). Ends the whole grant, whichever of its two
// tokens is sent. Unknown tokens still get 200.
export async function POST(req: Request) {
  if (!ownerTag()) return oauthJson({});

  const form = await readForm(req);
  if (form instanceof Response) return form;

  try {
    const auth = authenticateClient(req.headers, form);
    if (auth instanceof Response) return auth;
    const token = form.get("token");
    if (!token) return oauthError(400, "invalid_request", "token is required.");
    if (looksLikeSecret(token)) revokeByHash(oauthDb(), sha256(token), auth.client.id);
    return oauthJson({});
  } catch (e) {
    console.error(`oauth revoke: ${(e as Error).message}`);
    return oauthError(500, "server_error", "Something went wrong.");
  }
}

export function OPTIONS() {
  return preflight("POST, OPTIONS");
}
