import { authorize, json, logError, parseVersionParam } from "@/lib/resume-api";
import { ensureSeeded, getWriteDb } from "@/lib/resume-data";
import { getCurrentMeta, getVersionPdf } from "@/lib/resume-store/db";
import { isResumeType } from "@/lib/resume-types";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/resume/[type]/versions/[version]/pdf">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type, version } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  const parsed = parseVersionParam(version);
  if (parsed === null) return json({ error: "invalid_version" }, 400);
  const variant = new URL(req.url).searchParams.get("variant") ?? "public";
  if (variant !== "public" && variant !== "private") {
    return json({ error: "variant must be public or private" }, 400);
  }
  try {
    await ensureSeeded();
    const db = getWriteDb();
    const versionNo = parsed === "current" ? getCurrentMeta(db, type)?.versionNo : parsed;
    const pdf =
      versionNo === undefined ? undefined : getVersionPdf(db, type, versionNo, variant);
    if (!pdf) return json({ error: "pdf_not_found" }, 404);
    const suffix = variant === "private" ? "_private" : "";
    return new Response(Buffer.from(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="Matthew_Cheng_Resume_${type}_v${versionNo}${suffix}.pdf"`,
        "cache-control": "no-store, private",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    logError("GET /api/resume/[type]/versions/[version]/pdf", e);
    return json({ error: "internal" }, 500);
  }
}
