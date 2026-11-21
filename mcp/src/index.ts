// Stdio MCP server for the site's API (résumés, content sections, posts).
// The tools live in src/lib/mcp/tools.ts. stdout carries the protocol, so
// logs go to stderr only.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "../../src/lib/mcp/tools.ts";
import { call } from "./api.ts";

const server = new McpServer({ name: "resume", version: "1.1.0" });
registerTools(server, { call, pdf: "file", localFiles: true });

await server.connect(new StdioServerTransport());
console.error("resume-mcp: ready");
