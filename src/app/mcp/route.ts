import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createRemoteServer } from "@/lib/mcp/remote";
import { authenticateMcp } from "@/lib/oauth/bearer";
import { CORS, preflight } from "@/lib/oauth/http";

// Remote MCP over Streamable HTTP, stateless: a new server and transport
// per request, JSON responses, no sessions. Needs an OAuth access token.

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function POST(req: Request) {
  const auth = authenticateMcp(req);
  if (auth instanceof Response) return auth;
  const server = createRemoteServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 1024 * 1024,
  });
  transport.onerror = (e) => console.error("mcp: " + e.message);
  try {
    await server.connect(transport);
    const res = await transport.handleRequest(req, { authInfo: auth.authInfo });
    return withCors(res);
  } finally {
    void server.close();
  }
}

// Stateless: no standalone event stream and no session to end.
function notAllowed(req: Request): Response {
  const auth = authenticateMcp(req);
  if (auth instanceof Response) return auth;
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null },
    { status: 405, headers: { ...CORS, allow: "POST, OPTIONS", "cache-control": "no-store" } },
  );
}

export async function GET(req: Request) {
  return notAllowed(req);
}

export async function DELETE(req: Request) {
  return notAllowed(req);
}

export function OPTIONS() {
  return preflight("POST, GET, DELETE, OPTIONS");
}
