import fs from "node:fs";
import path from "node:path";
import { ApiError } from "../../src/lib/mcp/tools.ts";

// HTTP client for the site's API. The token comes from the env, or
// else from the repo's .env.local / .env (gitignored), and is never included
// in any message.
const ROOT = path.resolve(import.meta.dirname, "..", "..");

function readEnvFile(name: string): Record<string, string> {
  let text: string;
  try {
    text = fs.readFileSync(path.join(ROOT, name), "utf8");
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) out[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return out;
}

function setting(key: string): string | undefined {
  return (
    process.env[key] || readEnvFile(".env.local")[key] || readEnvFile(".env")[key] || undefined
  );
}

const BASE = (setting("RESUME_API_URL") || "https://matthewcheng.net").replace(/\/$/, "");

export async function call(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const token = setting("RESUME_API_TOKEN");
  if (!token) {
    throw new ApiError(
      "RESUME_API_TOKEN is not set. Add it to .env.local (or export it) and restart Claude Code.",
    );
  }
  const { timeoutMs = 30_000, ...rest } = init;
  try {
    return await fetch(BASE + path, {
      ...rest,
      headers: { ...rest.headers, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new ApiError(`request to ${BASE}${path} failed: ${(e as Error).message}`);
  }
}
