import { authorize, json, logError, readTexPayload } from "@/lib/resume-api";
import { compileTex } from "@/lib/resume-store/compile";
import { isResumeType } from "@/lib/resume-types";

// Compiles the public PDF and returns it. Saves nothing.
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/resume/[type]/preview">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { type } = await ctx.params;
  if (!isResumeType(type)) return json({ error: "unknown_type" }, 404);
  try {
    const payload = await readTexPayload(req);
    if (payload instanceof Response) return payload;

    const result = await compileTex(payload.tex, "public");
    if (!result.ok) {
      return json(
        { error: "compile_failed", reason: result.reason, logTail: result.logTail },
        422,
      );
    }
    const headers: Record<string, string> = {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Matthew_Cheng_Resume_${type}_preview.pdf"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    };
    if (result.pages !== null) headers["x-resume-pages"] = String(result.pages);
    return new Response(Buffer.from(result.pdf), { headers });
  } catch (e) {
    logError("POST /api/resume/[type]/preview", e);
    return json({ error: "internal" }, 500);
  }
}
