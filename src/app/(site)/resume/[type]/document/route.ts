import { connection, type NextRequest } from "next/server";
import { getVariantMeta } from "@/lib/resume";
import { ensureSeeded, envSecrets, getWriteDb } from "@/lib/resume-data";
import { compileBoth, tectonicAvailable } from "@/lib/resume-store/compile";
import {
  fillMissingPdfs,
  getCurrentMeta,
  getCurrentPublicPdf,
  getCurrentTex,
} from "@/lib/resume-store/db";
import { isResumeType, type ResumeType } from "@/lib/resume-types";

// Serves the current public PDF from the DB. No generateStaticParams: with no
// DB at build, a prerendered 404 would be baked in.

function notFoundPage(type: ResumeType) {
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Résumé PDF not available</title></head>
<body>
<h1>Résumé PDF not available</h1>
<p>The PDF for this version isn't ready yet. <a href="/resume/${type}">View the web version</a>.</p>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// The current version has tex but no PDF yet (seeded without tectonic).
async function compileMissing(type: ResumeType) {
  if (!(await tectonicAvailable())) return;
  const db = getWriteDb();
  const meta = getCurrentMeta(db, type);
  const tex = getCurrentTex(db, type);
  if (!meta || meta.hasPdfPublic || !tex) return;
  const result = await compileBoth(tex, envSecrets());
  if (!result.ok) {
    console.error(`resume pdf ${type}: ${result.variant} ${result.reason}`);
    return;
  }
  fillMissingPdfs(db, meta.id, result.pub.pdf, result.priv?.pdf ?? null);
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/resume/[type]/document">,
) {
  await connection();
  const { type } = await ctx.params;
  if (!isResumeType(type)) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  await ensureSeeded();
  let row = getCurrentPublicPdf(getWriteDb(), type);
  if (!row) {
    await compileMissing(type);
    row = getCurrentPublicPdf(getWriteDb(), type);
  }
  if (!row) return notFoundPage(type);

  const etag = `"${type}-v${row.versionNo}"`;
  const headers = {
    "cache-control": "public, max-age=0, must-revalidate",
    etag,
    "x-content-type-options": "nosniff",
  };
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(Buffer.from(row.pdf), {
    headers: {
      ...headers,
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Matthew_Cheng_Resume_${getVariantMeta(type).label}.pdf"`,
    },
  });
}
