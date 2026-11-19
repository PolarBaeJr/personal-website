import { getOwner } from "@/lib/owner";
import { logError, parseVersionParam } from "@/lib/resume-api";
import { ensureSeeded, getWriteDb } from "@/lib/resume-data";
import { getCurrentMeta, getVersionPdf } from "@/lib/resume-store/db";
import { isResumeType } from "@/lib/resume-types";

// Same as the token API's PDF route, but for a signed-in owner. The private
// PDF has the phone number and address, so it is never cached.

function notFoundResponse() {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(
  req: Request,
  ctx: RouteContext<"/admin/resume/[type]/versions/[v]/pdf">,
) {
  if (!(await getOwner())) return notFoundResponse();
  const { type, v } = await ctx.params;
  const parsed = parseVersionParam(v);
  if (!isResumeType(type) || parsed === null) return notFoundResponse();
  const variant = new URL(req.url).searchParams.get("variant") ?? "public";
  if (variant !== "public" && variant !== "private") return notFoundResponse();
  try {
    await ensureSeeded();
    const db = getWriteDb();
    const versionNo = parsed === "current" ? getCurrentMeta(db, type)?.versionNo : parsed;
    const pdf =
      versionNo === undefined ? undefined : getVersionPdf(db, type, versionNo, variant);
    if (!pdf) return notFoundResponse();
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
    logError("GET /admin/resume/[type]/versions/[v]/pdf", e);
    return new Response("Something went wrong", { status: 500 });
  }
}
