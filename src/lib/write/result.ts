import "server-only";
import type { Issue } from "@/lib/content-store/schema";
import { json } from "@/lib/resume-api";

// What every write returns. Route handlers turn it into a response; other
// callers (MCP, admin pages) can use it directly.
export type WriteResult<T> =
  | { ok: true; version: T }
  | {
      ok: false;
      status: number;
      error: string;
      issues?: Issue[];
      // Extra fields for the error body, e.g. a compile log tail.
      details?: Record<string, unknown>;
    };

export function fail(
  status: number,
  error: string,
  details?: Record<string, unknown>,
): WriteResult<never> {
  return { ok: false, status, error, details };
}

export function invalid(issues: Issue[]): WriteResult<never> {
  return { ok: false, status: 400, error: "invalid_content", issues };
}

export function writeResponse<T>(result: WriteResult<T>, okStatus = 201): Response {
  if (result.ok) return json(result.version, okStatus);
  const { status, error, issues, details } = result;
  return json({ error, ...(issues ? { issues } : {}), ...details }, status);
}
