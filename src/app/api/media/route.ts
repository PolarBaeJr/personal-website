import type { NextRequest } from "next/server";
import { MAX_UPLOAD_BYTES } from "@/lib/media/limits";
import { processImage } from "@/lib/media/process";
import { saveMediaFile } from "@/lib/media/store";
import { COOKIE_NAME, sameSecret, sessionForToken } from "@/lib/owner-session";
import { authorize, json, logError, readBodyLimited } from "@/lib/resume-api";
import { siteOrigin } from "@/lib/site-url";

// Photo uploads for the admin editors and the MCP upload_image tool. Not in
// the proxy matcher on purpose: a matched path has its body cloned and cut
// off at 10 MB. Takes the API token, or the owner session plus the csrf
// header plus a same-site Origin. The original is never kept, and nothing
// about its contents is logged.

const MAX_ACTIVE = 2;
const MAX_BODY = MAX_UPLOAD_BYTES + 256 * 1024;

let active = 0;

function tooLarge() {
  return json({ error: "too_large", maxBytes: MAX_UPLOAD_BYTES }, 413);
}

function checkAuth(req: NextRequest): Response | null {
  // A token request never falls back to the cookie.
  if (req.headers.has("authorization")) return authorize(req);

  const session = sessionForToken(req.cookies.get(COOKIE_NAME)?.value);
  if (!session) return json({ error: "unauthorized" }, 401);

  const csrf = req.headers.get("x-csrf-token");
  if (!csrf || !sameSecret(csrf, session.csrf)) return json({ error: "bad_csrf" }, 403);

  let origin: URL;
  try {
    origin = new URL(req.headers.get("origin") ?? "");
  } catch {
    return json({ error: "bad_origin" }, 403);
  }
  const requestHost = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0]
    .trim();
  if (origin.host !== new URL(siteOrigin()).host && origin.host !== requestHost) {
    return json({ error: "bad_origin" }, 403);
  }

  const site = req.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return json({ error: "bad_origin" }, 403);
  return null;
}

export async function POST(req: NextRequest) {
  const denied = checkAuth(req);
  if (denied) return denied;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "multipart_required" }, 415);
  }
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY) return tooLarge();

  if (active >= MAX_ACTIVE) {
    return Response.json(
      { error: "busy" },
      { status: 503, headers: { "cache-control": "no-store", "retry-after": "5" } },
    );
  }
  active++;
  try {
    const body = await readBodyLimited(req, MAX_BODY);
    if (body instanceof Response) return tooLarge();

    let form: FormData;
    try {
      form = await new Response(body as BodyInit, {
        headers: { "content-type": contentType },
      }).formData();
    } catch {
      return json({ error: "bad_form" }, 400);
    }

    const file = form.get("file");
    if (!(file instanceof Blob)) return json({ error: "file_required" }, 400);
    if (file.size > MAX_UPLOAD_BYTES) return tooLarge();

    const result = await processImage(new Uint8Array(await file.arrayBuffer()));
    if (!result.ok) return json({ error: result.error, message: result.message }, result.status);

    const { src } = await saveMediaFile(result.data, "webp");
    return json({ src, width: result.width, height: result.height }, 201);
  } catch (e) {
    logError("POST /api/media", e);
    return json({ error: "internal" }, 500);
  } finally {
    active--;
  }
}
