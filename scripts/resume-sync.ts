// Two-way sync between resumes/<type>.tex and the résumé API.
//   node scripts/resume-sync.ts pull [type...]
//   node scripts/resume-sync.ts push <type> "<note>"
// Reads RESUME_API_URL and RESUME_API_TOKEN from the env, then .env.local,
// then .env. The token is never printed.
import fs from "node:fs";
import path from "node:path";
import { RESUME_TYPES, isResumeType, type ResumeType } from "../src/lib/resume-types.ts";

const ROOT = path.join(import.meta.dirname, "..");
const DEFAULT_URL = "https://matthewcheng.net";

function usage(code: number): never {
  console.log(
    [
      "Usage:",
      "  node scripts/resume-sync.ts pull [type...]       download current tex into resumes/<type>.tex",
      '  node scripts/resume-sync.ts push <type> "<note>" upload resumes/<type>.tex as a new current version',
      "",
      `Types: ${RESUME_TYPES.join(", ")}`,
      `Env: RESUME_API_URL (default ${DEFAULT_URL}), RESUME_API_TOKEN.`,
      "Both are also read from .env.local or .env in the repo root.",
    ].join("\n"),
  );
  process.exit(code);
}

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
    if (!match) continue;
    out[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return out;
}

function setting(key: string): string | undefined {
  return (
    process.env[key] || readEnvFile(".env.local")[key] || readEnvFile(".env")[key] || undefined
  );
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const base = (setting("RESUME_API_URL") || DEFAULT_URL).replace(/\/$/, "");
const token = setting("RESUME_API_TOKEN");

async function call(route: string, init: RequestInit & { timeoutMs?: number } = {}) {
  if (!token) fail("RESUME_API_TOKEN is not set (env, .env.local or .env)");
  const { timeoutMs = 30_000, ...rest } = init;
  try {
    return await fetch(base + route, {
      ...rest,
      headers: { ...rest.headers, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    fail(`request to ${base}${route} failed: ${(e as Error).message}`);
  }
}

async function errorText(res: Response) {
  const body = await res.text();
  try {
    const data = JSON.parse(body) as { error?: string };
    return data.error ?? body;
  } catch {
    return body.slice(0, 500);
  }
}

function texPath(type: ResumeType) {
  return path.join(ROOT, "resumes", `${type}.tex`);
}

async function pull(types: ResumeType[]) {
  let failed = false;
  for (const type of types) {
    const res = await call(`/api/resume/${type}/versions/current`);
    if (!res.ok) {
      console.error(`${type}: HTTP ${res.status}: ${await errorText(res)}`);
      failed = true;
      continue;
    }
    const { meta, tex } = (await res.json()) as {
      meta: { versionNo: number };
      tex: string | null;
    };
    if (tex === null) {
      console.error(`${type}: current version v${meta.versionNo} has no tex`);
      failed = true;
      continue;
    }
    const file = texPath(type);
    let existing: string | null = null;
    try {
      existing = fs.readFileSync(file, "utf8");
    } catch {}
    if (existing === tex) {
      console.log(`${type}: unchanged (v${meta.versionNo})`);
    } else {
      fs.writeFileSync(file, tex, "utf8");
      console.log(`${type}: changed, wrote resumes/${type}.tex from v${meta.versionNo}`);
    }
  }
  if (failed) process.exit(1);
}

async function push(type: ResumeType, note: string) {
  let tex: string;
  try {
    tex = fs.readFileSync(texPath(type), "utf8");
  } catch {
    fail(`resumes/${type}.tex not found`);
  }
  const res = await call(`/api/resume/${type}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tex, note }),
    timeoutMs: 150_000,
  });
  const body = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(body) as Record<string, unknown>;
  } catch {}
  if (res.status === 201) {
    console.log(
      `${type}: saved v${data.version} as current${data.pages ? ` (${data.pages} page${data.pages === 1 ? "" : "s"})` : ""}`,
    );
    return;
  }
  if (res.status === 422) {
    console.error(
      `${type}: compile failed (${data.variant ?? "?"} ${data.reason ?? "?"}), nothing saved. Log tail:`,
    );
    console.error(String(data.logTail ?? ""));
    process.exit(1);
  }
  fail(`${type}: HTTP ${res.status}: ${String(data.error ?? body.slice(0, 500))}`);
}

const [command, ...rest] = process.argv.slice(2);
if (!command || command === "--help" || command === "-h") usage(command ? 0 : 64);

if (command === "pull") {
  const bad = rest.filter((t) => !isResumeType(t));
  if (bad.length) fail(`unknown type: ${bad.join(", ")}`);
  await pull(rest.length ? (rest as ResumeType[]) : [...RESUME_TYPES]);
} else if (command === "push") {
  const [type, note] = rest;
  if (!type || !isResumeType(type) || note === undefined || rest.length > 2) usage(64);
  await push(type, note);
} else {
  usage(64);
}
