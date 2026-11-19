// Signs the owner out everywhere by deleting every session in the content DB.
// Usage: npm run owner:sign-out-all   (CONTENT_DB / RESUME_DB pick the file)
import fs from "node:fs";
import { openContentDb, resolveContentDbPath } from "../src/lib/content-store/db.ts";
import { deleteAllSessions } from "../src/lib/content-store/owner.ts";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(
    [
      "Usage: npm run owner:sign-out-all",
      "",
      "Ends every owner session, so every browser has to sign in again at",
      "/login. Env: CONTENT_DB (default: content.db next to RESUME_DB).",
    ].join("\n"),
  );
  process.exit(0);
}

const file = resolveContentDbPath();
if (!fs.existsSync(file)) {
  console.log(`No content DB at ${file}, so there are no sessions.`);
  process.exit(0);
}

const db = openContentDb(file);
try {
  const count = deleteAllSessions(db);
  console.log(`Signed out ${count} session${count === 1 ? "" : "s"}.`);
} finally {
  db.close();
}
