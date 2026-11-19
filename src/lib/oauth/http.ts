import "server-only";
import { readBodyLimited } from "@/lib/resume-api";

// Responses for the OAuth and MCP endpoints. Browser-based clients call them
// cross-origin with a bearer token, never cookies, so CORS is open and
// credentials are off.

export const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, content-type, mcp-protocol-version, mcp-session-id, last-event-id",
  "access-control-expose-headers": "www-authenticate, mcp-session-id, mcp-protocol-version",
  "access-control-max-age": "86400",
};

const NO_STORE = { "cache-control": "no-store", pragma: "no-cache" };

export function oauthJson(
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return Response.json(data, { status, headers: { ...NO_STORE, ...CORS, ...extra } });
}

export function oauthError(
  status: number,
  error: string,
  description: string,
  extra: Record<string, string> = {},
): Response {
  return oauthJson({ error, error_description: description }, status, extra);
}

export function preflight(methods: string): Response {
  return new Response(null, {
    status: 204,
    headers: { ...CORS, "access-control-allow-methods": methods },
  });
}

// A form-encoded body (16 KB at most) where every parameter appears once.
export async function readForm(req: Request): Promise<URLSearchParams | Response> {
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/x-www-form-urlencoded") {
    return oauthError(400, "invalid_request", "Send the parameters form-encoded.");
  }
  const body = await readBodyLimited(req, 16 * 1024);
  if (body instanceof Response) {
    return oauthError(400, "invalid_request", "The request body is too large.");
  }
  const form = new URLSearchParams(new TextDecoder().decode(body));
  const seen = new Set<string>();
  for (const key of form.keys()) {
    if (seen.has(key)) {
      return oauthError(400, "invalid_request", `The parameter ${key} appears more than once.`);
    }
    seen.add(key);
  }
  return form;
}
