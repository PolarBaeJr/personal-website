// HTTP client for the site's résumé API. The token comes from the env and is
// never included in any message.
const BASE = (process.env.RESUME_API_URL || "https://matthewcheng.net").replace(/\/$/, "");

export class ApiError extends Error {}

export async function call(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const token = process.env.RESUME_API_TOKEN;
  if (!token) {
    throw new ApiError(
      "RESUME_API_TOKEN is not set. Export it in your shell and restart Claude Code.",
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
