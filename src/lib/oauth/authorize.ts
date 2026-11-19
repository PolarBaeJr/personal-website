import "server-only";
import { getClient, type OAuthClient } from "@/lib/content-store/oauth";
import { oauthDb, ownerTag, redirectMatches } from "@/lib/oauth/core";
import { isOurResource } from "@/lib/site-url";

// Checks a /oauth/authorize request. Shared by the proxy (which does the
// real redirects), the consent page and its Server Action.

export type AuthorizeCheck =
  | { kind: "off" }
  | { kind: "fatal"; message: string }
  | { kind: "redirect"; url: string }
  | {
      kind: "ok";
      client: OAuthClient;
      redirectUri: string;
      challenge: string;
      state: string | null;
      resource: string | null;
    };

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

// Each parameter's values, whichever shape they came in.
function valuesOf(params: Params): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (params instanceof URLSearchParams) {
    for (const [key, value] of params) map.set(key, [...(map.get(key) ?? []), value]);
  } else {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      map.set(key, Array.isArray(value) ? value : [value]);
    }
  }
  return map;
}

export function errorRedirect(
  redirectUri: string,
  error: string,
  description: string,
  state: string | null,
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return url.href;
}

export function checkAuthorizeRequest(params: Params): AuthorizeCheck {
  const tag = ownerTag();
  if (!tag) return { kind: "off" };

  const values = valuesOf(params);
  const one = (key: string) => {
    const list = values.get(key);
    return list && list.length === 1 ? list[0] : null;
  };

  // Until the client and redirect URI check out, errors are shown here
  // (fatal) rather than sent to an untrusted redirect URI.
  const clientId = one("client_id");
  const redirectUri = one("redirect_uri");
  if (!clientId || !redirectUri) {
    return {
      kind: "fatal",
      message: "This sign-in link is missing details. Start connecting again from the app.",
    };
  }
  const client = clientId.length <= 100 ? getClient(oauthDb(), clientId) : undefined;
  if (!client) {
    return {
      kind: "fatal",
      message:
        "This connection isn't registered here any more. In Claude, remove the connector and add it again.",
    };
  }
  if (!client.redirectUris.some((registered) => redirectMatches(redirectUri, registered))) {
    return {
      kind: "fatal",
      message: "This app asked to return somewhere it didn't register, so it can't connect.",
    };
  }

  const rawState = values.get("state");
  const state = rawState && rawState.length === 1 && rawState[0].length <= 1000 ? rawState[0] : null;
  const fail = (error: string, description: string): AuthorizeCheck => ({
    kind: "redirect",
    url: errorRedirect(redirectUri, error, description, state),
  });

  for (const [key, list] of values) {
    if (list.length > 1) return fail("invalid_request", `The parameter ${key} appears more than once.`);
  }
  if (one("response_type") !== "code") {
    return fail("unsupported_response_type", "Only response_type=code is supported.");
  }
  const challenge = one("code_challenge");
  if (!challenge || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) {
    return fail("invalid_request", "A PKCE code_challenge is required.");
  }
  if (one("code_challenge_method") !== "S256") {
    return fail("invalid_request", "S256 only");
  }
  if (rawState && rawState[0].length > 1000) {
    return fail("invalid_request", "The state parameter is too long.");
  }
  const resource = one("resource");
  if (resource !== null && !isOurResource(resource)) {
    return fail("invalid_target", "The resource isn't this site's MCP server.");
  }

  return { kind: "ok", client, redirectUri, challenge, state, resource };
}
