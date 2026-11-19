// The site's public origin, for OAuth metadata and redirects that must not
// use the internal host the request arrived on. No "server-only", so the
// proxy can import it. Env is read inside the functions, never at build.

const DEFAULT_ORIGIN = "https://matthewcheng.net";

let loggedBadUrl = false;

export function siteOrigin(): string {
  const value = process.env.SITE_URL;
  if (!value) return DEFAULT_ORIGIN;
  try {
    return new URL(value).origin;
  } catch {
    if (!loggedBadUrl) {
      loggedBadUrl = true;
      console.error("site url: SITE_URL isn't a valid URL; using the default");
    }
    return DEFAULT_ORIGIN;
  }
}

export function mcpResourceUrl(): string {
  return `${siteOrigin()}/mcp`;
}

export function protectedResourceMetadataUrl(): string {
  return `${siteOrigin()}/.well-known/oauth-protected-resource`;
}

// The MCP endpoint, with or without one trailing slash.
export function isOurResource(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash) return false;
  return url.href.replace(/\/$/, "") === mcpResourceUrl();
}
