// Compiles résumé .tex with tectonic. Shared by Next and plain node scripts,
// so only node:* builtins here. The tectonic child gets a minimal env and
// never sees the API token or the RESUME_* values; private details only enter
// through preamble() and are redacted from every log tail.
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const MAX_TEX_BYTES = 256 * 1024;
export const COMPILE_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 1024 * 1024;

export type Secrets = { phone: string; address: string };
export type CompileOk = {
  ok: true;
  pdf: Uint8Array;
  pages: number | null;
  logTail: string;
};
export type CompileErr = {
  ok: false;
  reason: "unavailable" | "timeout" | "failed" | "too-large";
  logTail: string;
};

const TEX_SPECIALS: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  $: "\\$",
  "&": "\\&",
  "#": "\\#",
  "^": "\\^{}",
  _: "\\_",
  "%": "\\%",
  "~": "\\textasciitilde{}",
};

export function escapeTex(s: string): string {
  return s
    .replace(/[\r\n]+/g, " ")
    .replace(/[\\{}$&#^_%~]/g, (ch) => TEX_SPECIALS[ch]);
}

export function preamble(mode: "public" | "private", s?: Secrets): string {
  const lines =
    mode === "public" || !s
      ? ["\\newif\\ifpublic\\publictrue", "\\def\\resumephone{}", "\\def\\resumeaddress{}"]
      : [
          "\\newif\\ifpublic\\publicfalse",
          `\\def\\resumephone{${escapeTex(s.phone)}}`,
          `\\def\\resumeaddress{${escapeTex(s.address)}}`,
        ];
  return lines.join("\n");
}

function bin() {
  return process.env.TECTONIC_BIN || "tectonic";
}

// Cast because Next's types make NODE_ENV required; tectonic doesn't need it.
function childEnv(): NodeJS.ProcessEnv {
  const env: Record<string, string> = { TECTONIC_UNTRUSTED_MODE: "1" };
  for (const key of ["PATH", "HOME", "TECTONIC_CACHE_DIR", "XDG_CACHE_HOME"]) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env as NodeJS.ProcessEnv;
}

let available: Promise<boolean> | undefined;

export function tectonicAvailable(): Promise<boolean> {
  available ??= new Promise<boolean>((resolve) => {
    const child = spawn(/*turbopackIgnore: true*/ bin(), ["--version"], { env: childEnv(), stdio: "ignore" });
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
  return available;
}

// Matches a secret even when TeX's log wraps it across lines.
function secretPattern(value: string) {
  const chars = [...value].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(chars.join("(?:\\r?\\n)?"), "g");
}

function redact(text: string, s?: Secrets): string {
  if (!s) return text;
  let out = text;
  for (const value of [s.phone, s.address, escapeTex(s.phone), escapeTex(s.address)]) {
    if (value.trim()) out = out.replace(secretPattern(value), "[redacted]");
  }
  return out;
}

function tail(text: string, lines = 40) {
  return text.split(/\r?\n/).slice(-lines).join("\n");
}

function lint(tex: string): string | null {
  if (/\\write18|\\immediate\s*\\write|\\openout|\\openin/.test(tex)) {
    return "tex uses a disallowed primitive (shell escape or file writes)";
  }
  if (/\\(?:input|include)(?![a-zA-Z])(?!\s*\{glyphtounicode\})/.test(tex)) {
    return "tex may only \\input{glyphtounicode}";
  }
  return null;
}

function countPages(log: string, pdf: Uint8Array): number | null {
  const fromLog = log.match(/\((\d+) pages?/);
  if (fromLog) return Number(fromLog[1]);
  const pages = Buffer.from(pdf).toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return pages ? pages.length : null;
}

// Compiles run one at a time to keep memory down on the Pi.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

function runTectonic(
  dir: string,
): Promise<{ code: number | null; output: string; timedOut: boolean; missing: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(
      /*turbopackIgnore: true*/ bin(),
      ["-X", "compile", "--untrusted", "--keep-logs", "--outdir", dir, "main.tex"],
      { cwd: dir, env: childEnv() },
    );
    let output = "";
    let timedOut = false;
    const collect = (chunk: Buffer) => {
      if (output.length < MAX_OUTPUT_BYTES) {
        output += chunk.toString("utf8").slice(0, MAX_OUTPUT_BYTES - output.length);
      }
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, COMPILE_TIMEOUT_MS);
    child.on("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      resolve({ code: null, output, timedOut, missing: e.code === "ENOENT" });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, output, timedOut, missing: false });
    });
  });
}

export function compileTex(
  tex: string,
  mode: "public" | "private",
  s?: Secrets,
): Promise<CompileOk | CompileErr> {
  if (Buffer.byteLength(tex, "utf8") > MAX_TEX_BYTES) {
    return Promise.resolve({ ok: false, reason: "too-large", logTail: "" });
  }
  const problem = lint(tex);
  if (problem) {
    return Promise.resolve({ ok: false, reason: "failed", logTail: problem });
  }

  return serial(async (): Promise<CompileOk | CompileErr> => {
    const dir = path.join(os.tmpdir(), "resume-" + crypto.randomUUID());
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, "main.tex"),
        preamble(mode, s) + "\n" + tex,
        "utf8",
      );
      const result = await runTectonic(dir);
      const log = await fs
        .readFile(path.join(dir, "main.log"), "utf8")
        .catch(() => "");
      const logTail = redact(tail(log || result.output), s);

      if (result.missing) return { ok: false, reason: "unavailable", logTail };
      if (result.timedOut) return { ok: false, reason: "timeout", logTail };
      if (result.code !== 0) return { ok: false, reason: "failed", logTail };

      const pdf = new Uint8Array(await fs.readFile(path.join(dir, "main.pdf")));
      return { ok: true, pdf, pages: countPages(log, pdf), logTail };
    } catch (e) {
      return {
        ok: false,
        reason: "failed",
        logTail: redact((e as Error).message, s),
      };
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
}

export async function compileBoth(
  tex: string,
  s: Secrets | null,
): Promise<
  | { ok: true; pub: CompileOk; priv: CompileOk | null }
  | (CompileErr & { variant: "public" | "private" })
> {
  const pub = await compileTex(tex, "public");
  if (!pub.ok) return { ...pub, variant: "public" };
  if (!s) return { ok: true, pub, priv: null };
  const priv = await compileTex(tex, "private", s);
  if (!priv.ok) return { ...priv, variant: "private" };
  return { ok: true, pub, priv };
}
