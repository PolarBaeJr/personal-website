import { connection, type NextRequest } from "next/server";
import { checkMediaAuth, listLibrary } from "@/lib/media/library";
import { json, logError } from "@/lib/resume-api";

// The photo library, newest first, for the editors' photo picker and the
// MCP list_images tool. Same auth as uploads.
export async function GET(req: NextRequest) {
  await connection();
  const denied = checkMediaAuth(req, { read: true });
  if (denied) return denied;
  try {
    const photos = await listLibrary();
    return json(
      photos.map(({ src, width, height, created_at, used_on }) => ({
        src,
        width,
        height,
        created_at,
        used_on,
      })),
    );
  } catch (e) {
    logError("GET /api/media/list", e);
    return json({ error: "internal" }, 500);
  }
}
