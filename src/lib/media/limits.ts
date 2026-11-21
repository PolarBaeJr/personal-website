// Upload limits and media file names. No imports, so client and server
// code can share them.

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
// A 48 MP phone photo is 48.8 million pixels.
export const MAX_INPUT_PIXELS = 50_000_000;
export const MAX_EDGE = 2000;

export const MEDIA_FILE_RE = /^[a-f0-9]{64}\.(webp|jpg)$/;
export const MEDIA_SRC_RE = /^\/media\/[a-f0-9]{64}\.(webp|jpg)$/;
