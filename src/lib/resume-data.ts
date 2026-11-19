import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { ResumeType } from "@/lib/resume-types";
import type { Secrets } from "@/lib/resume-store/compile";
import { getCurrentTex, openResumeDb, resolveDbPath } from "@/lib/resume-store/db";
import { seedAll } from "@/lib/resume-store/seed";

// Nothing here opens the DB at module scope: Next evaluates modules at build.

export function readRepoTex(type: ResumeType): string {
  try {
    return fs.readFileSync(
      path.join(process.cwd(), "resumes", `${type}.tex`),
      "utf8",
    );
  } catch {
    return "";
  }
}

let readDb: DatabaseSync | undefined;

// Read-only: never creates the DB file, seeds or compiles.
export function readCurrentTex(type: ResumeType): string {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return readRepoTex(type);
  }
  const file = resolveDbPath();
  if (!fs.existsSync(file)) return readRepoTex(type);
  try {
    readDb ??= openResumeDb(file, { readOnly: true });
    return getCurrentTex(readDb, type) ?? readRepoTex(type);
  } catch {
    return readRepoTex(type);
  }
}

let writeDb: DatabaseSync | undefined;

// Only for request-time code (route handlers); creates the file if needed.
export function getWriteDb(): DatabaseSync {
  writeDb ??= openResumeDb(resolveDbPath());
  return writeDb;
}

export function envSecrets(): Secrets | null {
  const { RESUME_PHONE, RESUME_ADDRESS } = process.env;
  return RESUME_PHONE && RESUME_ADDRESS
    ? { phone: RESUME_PHONE, address: RESUME_ADDRESS }
    : null;
}

let seeding: Promise<void> | undefined;

export function ensureSeeded(): Promise<void> {
  seeding ??= (async () => {
    await seedAll(getWriteDb(), {
      repoDir: process.cwd(),
      compile: true,
      secrets: envSecrets(),
    });
  })().catch((e: unknown) => {
    seeding = undefined;
    console.error(`resume seed: ${(e as Error).message}`);
  });
  return seeding;
}
