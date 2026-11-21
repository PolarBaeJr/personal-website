"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { TextField } from "@/components/admin/Fields";
import { useIssue } from "@/components/admin/FormIssues";
import { SortableList } from "@/components/admin/SortableList";
import { NOT_REACHED, SIGNED_OUT } from "@/lib/admin/form-state";
import { MAX_EDGE, MAX_ORIGINAL_BYTES, UPLOAD_TARGET_BYTES } from "@/lib/media/limits";

// Photo fields for the editors. A chosen file goes straight to /api/media
// (never with the editor's form, which has a 1 MB cap); the field then holds
// the returned src, width and height until the editor is saved. The proxy
// in front of the site refuses bodies over about 1 MB, so photos are shrunk
// on the device first.

export type ImageValue = { src: string; alt?: string; width?: number; height?: number };
export type ListImage = ImageValue & { alt: string };

type Uploaded = { src: string; width: number; height: number };

type UploadState =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "uploading" }
  | { kind: "error"; message: string };

const TOO_BIG = "That photo is over 40 MB. Pick a smaller one.";
const TOO_LARGE = "That photo is too large to upload. Try a smaller one.";
const UNREADABLE = "This photo couldn't be read here. Try a JPEG or PNG.";
const PASS_THROUGH = ["image/jpeg", "image/png", "image/webp"];
const QUALITIES = [0.86, 0.78, 0.7, 0.6];
const ALT_HINT =
  "Required. A few words for people who can't see it, like 'Presenting at the case competition'.";

// The latest props, for code that runs after an upload finishes: the ones
// from when the file was picked would undo anything edited meanwhile.
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

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
async function shrink(file: File): Promise<Blob | null> {
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

function useImageUpload(csrf: string) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  async function upload(file: File): Promise<Uploaded | null> {
    if (file.size > MAX_ORIGINAL_BYTES) {
      setState({ kind: "error", message: TOO_BIG });
      return null;
    }
    if (file.type && !file.type.startsWith("image/")) {
      setState({ kind: "error", message: "That isn't a photo." });
      return null;
    }
    setState({ kind: "preparing" });
    const photo = await shrink(file);
    if (!photo) {
      setState({ kind: "error", message: UNREADABLE });
      return null;
    }
    setState({ kind: "uploading" });
    // The original file name never leaves the device.
    const body = new FormData();
    body.append("file", photo, "photo");
    let res: Response;
    try {
      res = await fetch("/api/media", {
        method: "POST",
        body,
        headers: { "x-csrf-token": csrf },
        credentials: "same-origin",
      });
    } catch {
      setState({ kind: "error", message: NOT_REACHED });
      return null;
    }
    if (res.status === 201) {
      const done = (await res.json().catch(() => null)) as Uploaded | null;
      if (done && typeof done.src === "string") {
        setState({ kind: "idle" });
        return done;
      }
      setState({ kind: "error", message: "The photo couldn't be saved. Try again." });
      return null;
    }
    let message: string;
    if (res.status === 401 || res.status === 403) {
      message = SIGNED_OUT;
    } else if (res.status === 413) {
      message = TOO_LARGE;
    } else if (res.status === 415 || res.status === 400) {
      const data = (await res.json().catch(() => null)) as { message?: unknown } | null;
      message =
        typeof data?.message === "string" ? data.message : "That file couldn't be read as a photo.";
    } else if (res.status === 503) {
      message = "The site is busy with another photo. Try again in a moment.";
    } else {
      message = "The photo couldn't be saved. Try again.";
    }
    setState({ kind: "error", message });
    return null;
  }

  function fail(message: string) {
    setState({ kind: "error", message });
  }

  return { state, upload, fail };
}

function UploadButton({
  label,
  state,
  onFile,
}: {
  label: string;
  state: UploadState;
  onFile: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const busy = state.kind === "preparing" || state.kind === "uploading";
  return (
    <>
      {/* No name: the file must never go with the editor's form. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) onFile(file);
        }}
      />
      <button
        type="button"
        className="admin-btn"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {state.kind === "preparing" ? "Preparing…" : busy ? "Uploading…" : label}
      </button>
    </>
  );
}

function UploadStatus({ state }: { state: UploadState }) {
  return (
    <>
      <p className="admin-hint" role="status" aria-live="polite">
        {state.kind === "preparing"
          ? "Preparing the photo…"
          : state.kind === "uploading"
            ? "Uploading the photo…"
            : ""}
      </p>
      {state.kind === "error" && <p className="admin-error">{state.message}</p>}
    </>
  );
}

// A save issue on the photo itself (not its description).
function PhotoIssue({ path }: { path: string }) {
  const src = useIssue(`${path}.src`);
  const size = useIssue(`${path}.width`);
  const error = src ?? size;
  return error ? <p className="admin-error">{error}</p> : null;
}

function Thumb({ src, shape }: { src: string; shape: "square" | "wide" }) {
  return (
    <div className={"admin-image-frame admin-image-frame--" + shape}>
      <Image src={src} alt="" fill sizes="12rem" className="admin-image" />
    </div>
  );
}

export function ImageField({
  label,
  hint,
  path,
  value,
  onChange,
  csrf,
  withAlt = true,
  shape,
}: {
  label: string;
  hint?: ReactNode;
  path: string;
  value: ImageValue | undefined;
  onChange: (next: ImageValue | undefined) => void;
  csrf: string;
  withAlt?: boolean;
  shape: "square" | "wide";
}) {
  const { state, upload } = useImageUpload(csrf);
  const latest = useLatest({ value, onChange });
  // Without alt the value is a plain string, so issues point at the path.
  const plainError = useIssue(withAlt ? undefined : path);

  async function onFile(file: File) {
    const done = await upload(file);
    if (!done) return;
    const { value, onChange } = latest.current;
    onChange(
      withAlt
        ? { ...value, src: done.src, width: done.width, height: done.height, alt: value?.alt ?? "" }
        : { src: done.src },
    );
  }

  return (
    <div className="admin-field">
      <p className="admin-label">{label}</p>
      {hint && <p className="admin-hint">{hint}</p>}
      {value?.src ? <Thumb src={value.src} shape={shape} /> : <p className="admin-muted">No photo yet.</p>}
      <div className="admin-image-actions">
        <UploadButton
          label={value?.src ? "Replace photo" : "Upload photo"}
          state={state}
          onFile={onFile}
        />
        {value && (
          <button
            type="button"
            className="admin-btn admin-btn--quiet"
            onClick={() => onChange(undefined)}
          >
            Remove photo
          </button>
        )}
      </div>
      <UploadStatus state={state} />
      {withAlt ? <PhotoIssue path={path} /> : plainError && <p className="admin-error">{plainError}</p>}
      {withAlt && value && (
        <TextField
          label="Describe the photo"
          hint={ALT_HINT}
          path={`${path}.alt`}
          value={value.alt ?? ""}
          onChange={(alt) => onChange({ ...value, alt })}
        />
      )}
    </div>
  );
}

export function ImageListField({
  label,
  hint,
  path,
  items,
  onChange,
  csrf,
  addLabel,
}: {
  label: string;
  hint?: ReactNode;
  path: string;
  items: ListImage[];
  onChange: (items: ListImage[]) => void;
  csrf: string;
  addLabel: string;
}) {
  const { state, upload, fail } = useImageUpload(csrf);
  const latest = useLatest({ items, onChange });
  const labels = items.map((i, n) => i.alt?.trim() || `Photo ${n + 1}`);

  function move(from: number, to: number) {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  async function onFile(file: File) {
    const done = await upload(file);
    if (!done) return;
    const { items, onChange } = latest.current;
    if (items.some((i) => i.src === done.src)) {
      fail("That photo is already here.");
      return;
    }
    onChange([...items, { src: done.src, width: done.width, height: done.height, alt: "" }]);
  }

  return (
    <div className="admin-field">
      <p className="admin-label">{label}</p>
      {hint && <p className="admin-hint">{hint}</p>}
      {items.length === 0 ? (
        <p className="admin-muted">No screenshots yet.</p>
      ) : (
        // Srcs are content hashes: unique, and never clash with an outer
        // list's numeric keys.
        <SortableList
          keys={items.map((i) => i.src)}
          labels={labels}
          onMove={move}
          renderRow={(n, { grip, moveButtons }) => {
            const item = items[n];
            const itemPath = `${path}[${n}]`;
            return (
              <>
                <div className="admin-row-head">
                  {grip}
                  <span className="admin-row-title">{labels[n]}</span>
                </div>
                <div className="admin-row-body">
                  <Thumb src={item.src} shape="wide" />
                  <PhotoIssue path={itemPath} />
                  <TextField
                    label="Describe the photo"
                    hint={ALT_HINT}
                    path={`${itemPath}.alt`}
                    value={item.alt ?? ""}
                    onChange={(alt) =>
                      onChange(items.map((i, j) => (j === n ? { ...i, alt } : i)))
                    }
                  />
                </div>
                <div className="admin-row-actions">
                  {moveButtons}
                  <button
                    type="button"
                    className="admin-btn admin-btn--quiet"
                    onClick={() => onChange(items.filter((_, j) => j !== n))}
                  >
                    Remove photo<span className="sr-only"> {labels[n]}</span>
                  </button>
                </div>
              </>
            );
          }}
        />
      )}
      <div className="admin-image-actions">
        <UploadButton label={addLabel} state={state} onFile={onFile} />
      </div>
      <UploadStatus state={state} />
    </div>
  );
}
