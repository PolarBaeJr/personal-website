import {
  authorize,
  containsPrivateDetails,
  json,
  logError,
  privateDetailsError,
  readTexPayload,
  revalidateResume,
} from "@/lib/resume-api";
import { ensureSeeded, envSecrets, getWriteDb } from "@/lib/resume-data";
import { compileBoth } from "@/lib/resume-store/compile";
import { insertVersion, listVersions } from "@/lib/resume-store/db";
import { isResumeType } from "@/lib/resume-types";

type Ctx = RouteContext<"/api/resume/[type]">;

export async function GET(req: Request, ctx: Ctx) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  try {
    await ensureSeeded();
    return json({ type, versions: listVersions(getWriteDb(), type) });
  } catch (e) {
    logError("GET /api/resume/[type]", e);
    return json({ error: "internal" }, 500);
  }
}

// Update: compile both PDFs, then save a new current version. A failed
// compile saves nothing.
export async function POST(req: Request, ctx: Ctx) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  try {
    await ensureSeeded();
    const payload = await readTexPayload(req);
    if (payload instanceof Response) return payload;
    if (containsPrivateDetails(payload.tex)) return privateDetailsError();

    // With no phone/address configured, only the public PDF is built.
    const result = await compileBoth(payload.tex, envSecrets());
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

    const meta = insertVersion(
      getWriteDb(),
      {
        type,
        tex: payload.tex,
        pdfPublic: result.pub.pdf,
        pdfPrivate: result.priv?.pdf ?? null,
        note: payload.note,
        source: "tex",
      },
      { makeCurrent: true },
    );
    revalidateResume(type);
    return json(
      {
        type,
        version: meta.versionNo,
        id: meta.id,
        createdAt: meta.createdAt,
        pages: result.pub.pages,
      },
      201,
    );
  } catch (e) {
    logError("POST /api/resume/[type]", e);
    return json({ error: "internal" }, 500);
  }
}
