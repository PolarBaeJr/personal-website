import type { NextRequest } from "next/server";
import { clientIpFrom } from "@/lib/client-ip";
import { getWriteContentDb } from "@/lib/content-data";
import { completeLink } from "@/lib/content-store/media";
import { receiveUpload } from "@/lib/media/library";
import { checkUploadLink } from "@/lib/media/upload-link";
import { json, logError } from "@/lib/resume-api";

// The upload from a one-time link page. The token in the path is the only
// authorization. Not in the proxy matcher, for the same reason as
// /api/media. The link is used up only once the photo is saved, so a photo
// that can't be read can be swapped for another.

function closed() {
  return json({ error: "expired" }, 410);
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/upload/[token]">) {
  const { token } = await ctx.params;
  try {
    const check = checkUploadLink(token, clientIpFrom(req.headers));
    if (check.kind === "throttled") return json({ error: "too_many_tries" }, 429);
    if (check.kind === "closed") return closed();

    const result = await receiveUpload(req);
    if (result instanceof Response) return result;
    // If the link closed during the upload, the saved photo still stays in
    // the library; only the link refuses it.
    if (!completeLink(getWriteContentDb(), check.hash, result)) return closed();
    return json({ ok: true }, 201);
  } catch (e) {
    logError("POST /api/upload", e);
    return json({ error: "internal" }, 500);
  }
}
