import "server-only";
import { containsPrivateDetails, revalidateResume } from "@/lib/resume-api";
import { envSecrets, getWriteDb } from "@/lib/resume-data";
import { compileBoth, type CompileErr } from "@/lib/resume-store/compile";
import {
  getCurrentMeta,
  getCurrentTex,
  getVersion,
  getVersionPdf,
  insertVersion,
  replacePdfs,
} from "@/lib/resume-store/db";
import type { ResumeType } from "@/lib/resume-types";
import { fail, type WriteResult } from "@/lib/write/result";

// Callers await ensureSeeded() first.

function compileFailed(result: CompileErr & { variant: string }): WriteResult<never> {
  return fail(422, "compile_failed", {
    variant: result.variant,
    reason: result.reason,
    logTail: result.logTail,
  });
}

// Update: compile both PDFs, then save a new current version. A failed
// compile saves nothing.
export async function saveResume(
  type: ResumeType,
  tex: string,
  note: string,
): Promise<
  WriteResult<{ type: ResumeType; version: number; id: number; createdAt: string; pages: number | null }>
> {
  if (containsPrivateDetails(tex)) {
    return fail(400, "tex must use \\resumephone and \\resumeaddress, not the literal values");
  }

  // With no phone/address configured, only the public PDF is built.
  const result = await compileBoth(tex, envSecrets());
  if (!result.ok) return compileFailed(result);

  const meta = insertVersion(
    getWriteDb(),
    {
      type,
      tex,
      pdfPublic: result.pub.pdf,
      pdfPrivate: result.priv?.pdf ?? null,
      note,
      source: "tex",
    },
    { makeCurrent: true },
  );
  revalidateResume(type);
  return {
    ok: true,
    version: {
      type,
      version: meta.versionNo,
      id: meta.id,
      createdAt: meta.createdAt,
      pages: result.pub.pages,
    },
  };
}

// Copies an earlier tex version into a new current version. History is
// append-only, so nothing is overwritten.
export async function restoreResume(
  type: ResumeType,
  version: number,
  note: string,
): Promise<
  WriteResult<{ type: ResumeType; version: number; id: number; createdAt: string; restoredFrom: number }>
> {
  const db = getWriteDb();
  const source = getVersion(db, type, version);
  if (!source) return fail(404, "version_not_found");
  if (source.source === "import" || source.tex === null) {
    return fail(400, "imported PDFs cannot become current");
  }

  let pdfPublic = getVersionPdf(db, type, version, "public") ?? null;
  let pdfPrivate = getVersionPdf(db, type, version, "private") ?? null;
  const secrets = envSecrets();
  if (!pdfPublic || (secrets && !pdfPrivate)) {
    const result = await compileBoth(source.tex, secrets);
    if (!result.ok) return compileFailed(result);
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
      note: note ? `restore of v${version}: ${note}` : `restore of v${version}`,
      source: "tex",
    },
    { makeCurrent: true },
  );
  revalidateResume(type);
  return {
    ok: true,
    version: {
      type,
      version: meta.versionNo,
      id: meta.id,
      createdAt: meta.createdAt,
      restoredFrom: version,
    },
  };
}

// Recompiles the current tex in place (e.g. after RESUME_PHONE or
// RESUME_ADDRESS change). No new version is created.
export async function regenerateResume(
  type: ResumeType,
): Promise<WriteResult<{ type: ResumeType; version: number; pages: number | null }>> {
  const db = getWriteDb();
  const meta = getCurrentMeta(db, type);
  const tex = getCurrentTex(db, type);
  if (!meta || !tex) return fail(404, "version_not_found");

  const result = await compileBoth(tex, envSecrets());
  if (!result.ok) return compileFailed(result);

  replacePdfs(db, meta.id, result.pub.pdf, result.priv?.pdf ?? null);
  revalidateResume(type);
  return { ok: true, version: { type, version: meta.versionNo, pages: result.pub.pages } };
}
