import {
  authorize,
  json,
  logError,
  readJsonBody,
  readNote,
  revalidateResume,
} from "@/lib/resume-api";
import { ensureSeeded, envSecrets, getWriteDb } from "@/lib/resume-data";
import { compileBoth } from "@/lib/resume-store/compile";
import { getVersion, getVersionPdf, insertVersion } from "@/lib/resume-store/db";
import { isResumeType } from "@/lib/resume-types";

// Copies an earlier tex version into a new current version. History is
// append-only, so nothing is overwritten.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/resume/[type]/restore">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  try {
    await ensureSeeded();
    const data = await readJsonBody(req);
    if (data instanceof Response) return data;
    const { version, note } = (data ?? {}) as { version?: unknown; note?: unknown };
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
      return json({ error: "version must be a positive integer" }, 400);
    }
    const extra = readNote(note);
    if (extra instanceof Response) return extra;

    const db = getWriteDb();
    const source = getVersion(db, type, version);
    if (!source) return json({ error: "version_not_found" }, 404);
    if (source.source === "import" || source.tex === null) {
      return json({ error: "imported PDFs cannot become current" }, 400);
    }

    let pdfPublic = getVersionPdf(db, type, version, "public") ?? null;
    let pdfPrivate = getVersionPdf(db, type, version, "private") ?? null;
    const secrets = envSecrets();
    if (!pdfPublic || (secrets && !pdfPrivate)) {
      const result = await compileBoth(source.tex, secrets);
      if (!result.ok) {
        return json(
          {
            error: "compile_failed",
            variant: result.variant,
            reason: result.reason,
            logTail: result.logTail,
          },
          422,
        );
      }
      pdfPublic = result.pub.pdf;
      pdfPrivate = result.priv?.pdf ?? null;
    }

    const meta = insertVersion(
      db,
      {
        type,
        tex: source.tex,
        pdfPublic,
        pdfPrivate,
        note: extra ? `restore of v${version}: ${extra}` : `restore of v${version}`,
        source: "tex",
      },
      { makeCurrent: true },
    );
    revalidateResume(type);
    return json(
      { type, version: meta.versionNo, id: meta.id, createdAt: meta.createdAt, restoredFrom: version },
      201,
    );
  } catch (e) {
    logError("POST /api/resume/[type]/restore", e);
    return json({ error: "internal" }, 500);
  }
}
