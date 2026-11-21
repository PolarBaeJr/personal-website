// Shrinks a photo on the device before upload: the proxy in front of the
// site refuses bodies over about 1 MB. Browser only. Used by the admin
// photo fields and the one-time upload link page.
import { MAX_EDGE, UPLOAD_TARGET_BYTES } from "@/lib/media/limits";

const PASS_THROUGH = ["image/jpeg", "image/png", "image/webp"];
const QUALITIES = [0.86, 0.78, 0.7, 0.6];

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

async function decode(file: File): Promise<Decoded | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {}
  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

function draw(image: Decoded, width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // JPEG has no transparency; white beats black behind a transparent PNG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image.source, 0, 0, width, height);
    return (quality: number) => canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image.source, 0, 0, width, height);
  return (quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// A JPEG of the photo with its long edge at most MAX_EDGE and its size at
// most UPLOAD_TARGET_BYTES, or the file itself when it already fits. The
// re-encode drops EXIF; the server strips metadata again anyway.
export async function shrinkPhoto(file: File): Promise<Blob | null> {
  const image = await decode(file);
  if (!image) return null;
  try {
    const long = Math.max(image.width, image.height);
    if (!long) return null;
    if (PASS_THROUGH.includes(file.type) && file.size <= UPLOAD_TARGET_BYTES && long <= MAX_EDGE) {
      return file;
    }
    let scale = Math.min(1, MAX_EDGE / long);
    for (let step = 0; step < 12; step++) {
      const encode = draw(
        image,
        Math.max(1, Math.round(image.width * scale)),
        Math.max(1, Math.round(image.height * scale)),
      );
      if (!encode) return null;
      // Lower quality first at full size, then only the lowest when smaller.
      for (const quality of step === 0 ? QUALITIES : QUALITIES.slice(-1)) {
        const blob = await encode(quality);
        if (!blob) return null;
        if (blob.size <= UPLOAD_TARGET_BYTES) return blob;
      }
      scale *= 0.8;
    }
    return null;
  } catch {
    return null;
  } finally {
    image.close();
  }
}
