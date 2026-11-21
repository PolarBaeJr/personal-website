import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiError, registerTools, type Call } from "@/lib/mcp/tools";

// The remote MCP server behind /mcp. Its tools call this server's own API
// over loopback with RESUME_API_TOKEN, so every route's validation and
// error format apply unchanged. The token never leaves the server.

export const remoteCall: Call = async (route, init = {}) => {
  const token = process.env.RESUME_API_TOKEN;
  if (!token) {
    throw new ApiError(
      "The site's editing API is turned off on the server (RESUME_API_TOKEN isn't set).",
    );
  }
  const { timeoutMs = 30_000, ...rest } = init;
  try {
    return await fetch("http://127.0.0.1:" + (process.env.PORT || "3000") + route, {
      ...rest,
      headers: {
        ...(rest.headers as Record<string, string>),
        authorization: "Bearer " + token,
        "x-actor": "claude-app",
      },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (e) {
    throw new ApiError("request to " + route + " failed: " + (e as Error).message);
  }
};

export function createRemoteServer(): McpServer {
  const server = new McpServer({ name: "site", version: "1.2.0" });
  registerTools(server, { call: remoteCall, pdf: "embed", localFiles: false });
  return server;
}
