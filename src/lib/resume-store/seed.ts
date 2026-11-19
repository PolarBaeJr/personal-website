// Seeds each résumé type from resumes/<type>.tex when it has no tex version
// yet. Shared by the entrypoint script and the app, so builtins and relative
// .ts imports only.
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { RESUME_TYPES, type ResumeType } from "../resume-types.ts";
import { compileBoth, tectonicAvailable, type Secrets } from "./compile.ts";
import { hasTexVersion, insertVersion } from "./db.ts";

export type SeedStatus = "exists" | "missing" | "seeded" | "seeded-no-pdf";
export type SeedOptions = {
  // Directory that holds resumes/.
  repoDir: string;
  compile: boolean;
  secrets: Secrets | null;
};

export async function seedType(
  db: DatabaseSync,
  type: ResumeType,
  opts: SeedOptions,
): Promise<SeedStatus> {
  if (hasTexVersion(db, type)) return "exists";

  let tex: string;
  try {
    tex = fs.readFileSync(path.join(opts.repoDir, "resumes", `${type}.tex`), "utf8");
  } catch {
    return "missing";
  }

  let pdfPublic: Uint8Array | null = null;
  let pdfPrivate: Uint8Array | null = null;
  if (opts.compile && (await tectonicAvailable())) {
    const result = await compileBoth(tex, opts.secrets);
    if (result.ok) {
      pdfPublic = result.pub.pdf;
      pdfPrivate = result.priv?.pdf ?? null;
    } else {
      console.error(`seed ${type}: ${result.variant} ${result.reason}`);
    }
  }

  // Another process may have seeded while this one compiled.
  if (hasTexVersion(db, type)) return "exists";
  insertVersion(
    db,
    { type, tex, pdfPublic, pdfPrivate, note: "seed", source: "tex" },
    { makeCurrent: true },
  );
  return pdfPublic ? "seeded" : "seeded-no-pdf";
}

export async function seedAll(
  db: DatabaseSync,
  opts: SeedOptions,
): Promise<Record<ResumeType, SeedStatus>> {
  const result = {} as Record<ResumeType, SeedStatus>;
  for (const type of RESUME_TYPES) {
    result[type] = await seedType(db, type, opts);
  }
  return result;
}
