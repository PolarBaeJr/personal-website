// Seeds the résumé DB from resumes/<type>.tex for any type without a tex
// version, compiling the PDFs when tectonic is available.
// Usage: node scripts/seed-resume.ts   (RESUME_DB picks the file)
import path from "node:path";
import { openResumeDb, resolveDbPath } from "../src/lib/resume-store/db.ts";
import { seedAll } from "../src/lib/resume-store/seed.ts";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(
    [
      "Usage: node scripts/seed-resume.ts",
      "",
      "Seeds each résumé type from resumes/<type>.tex when the DB has no tex",
      "version for it. Types that already have one are left alone.",
      "",
      "Env: RESUME_DB (default ./data/resume.db); RESUME_PHONE and",
      "RESUME_ADDRESS (both needed for the private PDF); TECTONIC_BIN.",
    ].join("\n"),
  );
  process.exit(0);
}

const { RESUME_PHONE, RESUME_ADDRESS } = process.env;
const secrets =
  RESUME_PHONE && RESUME_ADDRESS
    ? { phone: RESUME_PHONE, address: RESUME_ADDRESS }
    : null;

const db = openResumeDb(resolveDbPath());
try {
  const result = await seedAll(db, {
    repoDir: path.join(import.meta.dirname, ".."),
    compile: true,
    secrets,
  });
  for (const [type, status] of Object.entries(result)) {
    console.log(`resume seed ${type}: ${status}`);
  }
} finally {
  db.close();
}
