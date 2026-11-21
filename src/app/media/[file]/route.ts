import fs from "node:fs";
import { Readable } from "node:stream";
import { connection, type NextRequest } from "next/server";
import { mediaFilePath } from "@/lib/media/store";

// Serves uploaded photos. Names are content hashes, so a file never
// changes and can be cached for good.

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(req: NextRequest, ctx: RouteContext<"/media/[file]">) {
  await connection();
  const { file } = await ctx.params;
  const p = mediaFilePath(file);
  if (!p) return notFound();

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(p);
  } catch {
    return notFound();
  }
  if (!stat.isFile()) return notFound();

  const etag = `"${file.split(".")[0]}"`;
  const headers = {
    "cache-control": "public, max-age=31536000, immutable",
    etag,
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'",
  };
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(Readable.toWeb(fs.createReadStream(p)) as ReadableStream, {
    headers: {
      ...headers,
      "content-type": file.endsWith(".jpg") ? "image/jpeg" : "image/webp",
      "content-length": String(stat.size),
    },
  });
}
