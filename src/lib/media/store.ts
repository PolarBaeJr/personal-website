import "server-only";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveContentDbPath } from "@/lib/content-store/db";
import { MEDIA_FILE_RE } from "@/lib/media/limits";

// Uploaded photos, stored as <sha256>.<ext> so the same photo is one file.
// Never log bytes or names from here.

export function mediaDir(): string {
  return path.resolve(
    /*turbopackIgnore: true*/ process.env.MEDIA_DIR || path.join(path.dirname(resolveContentDbPath()), "media"),
  );
}

// The regex alone rules out traversal.
export function mediaFilePath(file: string): string | null {
  if (!MEDIA_FILE_RE.test(file)) return null;
  return path.join(/*turbopackIgnore: true*/ mediaDir(), file);
}

export async function saveMediaFile(
  bytes: Uint8Array,
  ext: "webp",
): Promise<{ src: string; file: string }> {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const file = hash + "." + ext;
  const dir = mediaDir();
  const target = path.join(/*turbopackIgnore: true*/ dir, file);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(target);
    return { src: "/media/" + file, file };
  } catch {}
  const temp = path.join(/*turbopackIgnore: true*/ dir, `${file}.${randomBytes(6).toString("hex")}.tmp`);
  try {
    await fs.writeFile(temp, bytes, { flag: "wx", mode: 0o644 });
    await fs.rename(temp, target);
  } catch (e) {
    await fs.unlink(temp).catch(() => {});
    throw e;
  }
  return { src: "/media/" + file, file };
}
