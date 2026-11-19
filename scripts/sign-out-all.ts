// Signs the owner out everywhere by deleting every session in the content DB,
// and disconnects every connected app (OAuth codes and tokens).
// Usage: npm run owner:sign-out-all   (CONTENT_DB / RESUME_DB pick the file)
import fs from "node:fs";
import { openContentDb, resolveContentDbPath } from "../src/lib/content-store/db.ts";
import { deleteAllOAuthGrants } from "../src/lib/content-store/oauth.ts";
import { deleteAllSessions } from "../src/lib/content-store/owner.ts";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(
    [
      "Usage: npm run owner:sign-out-all",
      "",
      "Ends every owner session, so every browser has to sign in again at",
      "/login, and disconnects every connected app (like the Claude app), which",
      "then has to be connected again. Env: CONTENT_DB (default: content.db",
      "next to RESUME_DB).",
    ].join("\n"),
  );
  process.exit(0);
}

const file = resolveContentDbPath();
if (!fs.existsSync(file)) {
  console.log(`No content DB at ${file}, so there are no sessions or app connections.`);
  process.exit(0);
}

const db = openContentDb(file);
try {
  const count = deleteAllSessions(db);
  const apps = deleteAllOAuthGrants(db);
  console.log(
    `Signed out ${count} session${count === 1 ? "" : "s"} and disconnected ${apps} app connection${apps === 1 ? "" : "s"}.`,
  );
} finally {
  db.close();
}
