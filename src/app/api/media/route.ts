import type { NextRequest } from "next/server";
import { checkMediaAuth, receiveUpload } from "@/lib/media/library";
import { json, logError } from "@/lib/resume-api";

// Photo uploads for the admin editors and the MCP upload_image tool. Not in
// the proxy matcher on purpose: a matched path has its body cloned and cut
// off at 10 MB. Takes the API token, or the owner session plus the csrf
// header plus a same-site Origin. The original is never kept, and nothing
// about its contents is logged.

export async function POST(req: NextRequest) {
  const denied = checkMediaAuth(req);
  if (denied) return denied;
  try {
    const result = await receiveUpload(req);
    if (result instanceof Response) return result;
    return json(result, 201);
  } catch (e) {
    logError("POST /api/media", e);
    return json({ error: "internal" }, 500);
  }
}
