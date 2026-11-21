import "server-only";
import { MAX_EDGE, MAX_INPUT_PIXELS } from "@/lib/media/limits";

// Re-encodes an upload to clean WebP. The magic-byte sniff runs first, so
// anything but JPEG, PNG, WebP or HEIF never reaches libvips. No metadata
// is kept: EXIF (GPS included), XMP, IPTC and ICC are all dropped.

export type ImageKind = "jpeg" | "png" | "webp" | "heif";

export type Processed =
  | { ok: true; data: Buffer; width: number; height: number }
  | { ok: false; status: number; error: string; message: string };

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "avif"]);

function ascii(b: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...b.subarray(start, end));
}

export function sniffImage(b: Uint8Array): ImageKind | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 8 && png.every((v, i) => b[i] === v)) return "png";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "webp";
  if (b.length >= 12 && ascii(b, 4, 8) === "ftyp" && HEIF_BRANDS.has(ascii(b, 8, 12))) {
    return "heif";
  }
  return null;
}

let configured = false;

export async function processImage(input: Uint8Array): Promise<Processed> {
  const kind = sniffImage(input);
  if (!kind) {
    return {
      ok: false,
      status: 415,
      error: "unsupported_type",
      message: "Upload a JPEG, PNG or WebP photo.",
    };
  }
  // Loaded here, so `next build` never loads the native module.
  const sharp = (await import("sharp")).default;
  if (!configured) {
    sharp.cache(false);
    configured = true;
  }
  try {
    const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { ok: true, data, width: info.width, height: info.height };
  } catch (e) {
    const message = (e as Error).message;
    console.error(`processImage: ${message}`);
    if (/pixel limit/i.test(message)) {
      return {
        ok: false,
        status: 413,
        error: "too_many_pixels",
        message: "That photo is too big (over 50 megapixels). Make it smaller and try again.",
      };
    }
    if (kind === "heif") {
      return {
        ok: false,
        status: 415,
        error: "heic_unsupported",
        message:
          "This looks like an iPhone HEIC photo, which can't be read here. Choose the photo again from Photos (it's usually sent as JPEG), or export it as JPEG.",
      };
    }
    return {
      ok: false,
      status: 400,
      error: "unreadable_image",
      message: "That file couldn't be read as a photo.",
    };
  }
}
