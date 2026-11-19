// Imports old résumé PDFs as private, never-current history versions.
// Usage: node scripts/import-resume-pdfs.ts <dir> [--dry-run] [--db <path>]
// Prints filenames only, never PDF contents.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ResumeType } from "../src/lib/resume-types.ts";
import {
  importPdfsForFilename,
  insertVersion,
  openResumeDb,
  resolveDbPath,
} from "../src/lib/resume-store/db.ts";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const SKIP_NAMES = new Set(["resume_check_b.pdf", "resume_check_2page.pdf"]);
const BUNDLE = /CoverLetter|Transcript|package/i;

const TYPE_RULES: Array<[RegExp, ResumeType]> = [
  [/accounting/i, "accounting"],
  [/audit/i, "auditing"],
  [/finance|operations/i, "finance"],
  [/tech|data|software/i, "tech"],
];

// Words that describe the résumé rather than the company it was tailored for.
const GENERIC_WORDS =
  /\b(?:matthew|cheng|matthewcheng|resume|master|final|latest|accounting|audit|auditing|finance|financial|operations|tech|data|software|co|op|coop)\b/gi;

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

type Candidate = {
  file: string;
  basename: string;
  type: ResumeType;
  nameDate: string | null;
  version: number | null;
  company: string | null;
  createdAt: string;
  mtimeMs: number;
};

function usage(code: number): never {
  console.log(
    [
      "Usage: node scripts/import-resume-pdfs.ts <dir> [--dry-run] [--db <path>]",
      "",
      "Imports PDFs whose name contains 'resume' as private history versions.",
      "They are never made current. Cover-letter, transcript and package",
      "bundles are skipped, and re-running skips files already imported.",
      "",
      "Env: RESUME_DB (default ./data/resume.db), overridden by --db.",
    ].join("\n"),
  );
  process.exit(code);
}

function parseArgs(argv: string[]) {
  let dir: string | undefined;
  let db: string | undefined;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage(0);
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--db") db = argv[++i];
    else if (!arg.startsWith("-") && !dir) dir = arg;
    else usage(64);
  }
  if (!dir) usage(64);
  return { dir, db, dryRun };
}

function typeFor(name: string): ResumeType {
  for (const [pattern, type] of TYPE_RULES) if (pattern.test(name)) return type;
  return "general";
}

function dateFor(name: string): string | null {
  const ymd = /(20\d{2})[-_. ](\d{2})[-_. ](\d{2})(?!\d)/.exec(name);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const ym = /(20\d{2})[-_.](\d{2})(?!\d)/.exec(name);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  const my = /(?:^|[^a-z])(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[_ -](20\d{2})/i.exec(name);
  if (my) return `${my[2]}-${MONTHS[my[1].toLowerCase()]}-01`;
  return null;
}

function versionFor(name: string): number | null {
  const match = /(?:^|[^a-z])v(\d{1,3})(?![\d])/i.exec(name);
  return match ? Number(match[1]) : null;
}

function companyFor(name: string): string | null {
  const stem = name
    .replace(/\.pdf$/i, "")
    .replace(/20\d{2}[-_. ]\d{2}([-_. ]\d{2})?/g, " ")
    .replace(/\(\d+\)/g, " ")
    .replace(/-\d+\b/g, " ")
    .replace(/(?:^|[^a-z])v\d+/gi, " ")
    .replace(/[_()-]+/g, " ")
    .replace(GENERIC_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stem || null;
}

// SQLite CURRENT_TIMESTAMP format, in UTC.
function sqlTimestamp(iso: string) {
  return iso.slice(0, 19).replace("T", " ");
}

function collect(dir: string): { candidates: Candidate[]; skipped: string[] } {
  const candidates: Candidate[] = [];
  const skipped: string[] = [];
  for (const basename of fs.readdirSync(dir).sort()) {
    if (!/\.pdf$/i.test(basename) || !/resume/i.test(basename)) continue;
    if (SKIP_NAMES.has(basename.toLowerCase())) {
      skipped.push(`${basename}  (check file)`);
      continue;
    }
    if (BUNDLE.test(basename)) {
      skipped.push(`${basename}  (cover letter or transcript bundle)`);
      continue;
    }
    const file = path.join(dir, basename);
    const stat = fs.statSync(file);
    if (!stat.isFile()) continue;
    if (stat.size > MAX_PDF_BYTES) {
      skipped.push(`${basename}  (over 10 MB)`);
      continue;
    }
    const nameDate = dateFor(basename);
    candidates.push({
      file,
      basename,
      type: typeFor(basename),
      nameDate,
      version: versionFor(basename),
      company: companyFor(basename),
      createdAt: nameDate
        ? `${nameDate} 00:00:00`
        : sqlTimestamp(stat.mtime.toISOString()),
      mtimeMs: stat.mtimeMs,
    });
  }
  candidates.sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) ||
      (a.version ?? 0) - (b.version ?? 0) ||
      a.mtimeMs - b.mtimeMs ||
      a.basename.localeCompare(b.basename),
  );
  return { candidates, skipped };
}

function noteFor(c: Candidate) {
  const parts = [c.nameDate ?? `file date ${c.createdAt.slice(0, 10)}`];
  if (c.version !== null) parts.push(`v${c.version}`);
  if (c.company) parts.push(c.company);
  return `import: ${c.basename} (${parts.join(", ")})`;
}

function sha256(bytes: Uint8Array) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

const args = parseArgs(process.argv.slice(2));
const { candidates, skipped } = collect(args.dir);
const db = args.dryRun ? null : openResumeDb(args.db ?? resolveDbPath());
const counts: Record<string, number> = {};
let imported = 0;

try {
  for (const name of skipped) console.log(`skip  ${name}`);
  for (const c of candidates) {
    const bytes = new Uint8Array(fs.readFileSync(c.file));
    let action: string;
    if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== "%PDF-") {
      action = "skip (not a PDF)";
    } else if (!db) {
      action = "would import";
    } else {
      const hash = sha256(bytes);
      if (importPdfsForFilename(db, c.basename).some((pdf) => sha256(pdf) === hash)) {
        action = "skip (already imported)";
      } else {
        const meta = insertVersion(
          db,
          {
            type: c.type,
            tex: null,
            pdfPublic: null,
            pdfPrivate: bytes,
            note: noteFor(c),
            source: "import",
            originalFilename: c.basename,
            createdAt: c.createdAt,
          },
          { makeCurrent: false },
        );
        action = `imported as v${meta.versionNo}`;
        imported++;
      }
    }
    if (!action.startsWith("skip")) counts[c.type] = (counts[c.type] ?? 0) + 1;
    console.log(
      [
        c.type.padEnd(10),
        c.createdAt.slice(0, 10),
        (c.version === null ? "-" : `v${c.version}`).padEnd(4),
        c.basename,
        action,
      ].join("  "),
    );
  }
  const summary = Object.entries(counts)
    .map(([type, n]) => `${type} ${n}`)
    .join(", ");
  console.log(
    args.dryRun
      ? `dry run: ${candidates.length} candidates (${summary || "none"}), ${skipped.length} skipped; nothing written`
      : `imported ${imported} (${summary || "none"}), ${skipped.length} skipped`,
  );
} finally {
  db?.close();
}
