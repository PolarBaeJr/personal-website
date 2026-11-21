"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { TextField } from "@/components/admin/Fields";
import { useIssue } from "@/components/admin/FormIssues";
import { SortableList } from "@/components/admin/SortableList";
import { formatWhen } from "@/lib/admin/fields";
import { NOT_REACHED, SIGNED_OUT } from "@/lib/admin/form-state";
import { MAX_ORIGINAL_BYTES } from "@/lib/media/limits";
import { shrinkPhoto } from "@/lib/media/shrink-client";

// Photo fields for the editors. A chosen file goes straight to /api/media
// (never with the editor's form, which has a 1 MB cap); the field then holds
// the returned src, width and height until the editor is saved. The proxy
// in front of the site refuses bodies over about 1 MB, so photos are shrunk
// on the device first. "Choose from your photos" picks one already in the
// library instead.

export type ImageValue = { src: string; alt?: string; width?: number; height?: number };
export type ListImage = ImageValue & { alt: string };

type Uploaded = { src: string; width: number; height: number };

type LibraryPhoto = Uploaded & { created_at: string; used_on: string[] };

type UploadState =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "uploading" }
  | { kind: "error"; message: string };

const TOO_BIG = "That photo is over 40 MB. Pick a smaller one.";
const TOO_LARGE = "That photo is too large to upload. Try a smaller one.";
const UNREADABLE = "This photo couldn't be read here. Try a JPEG or PNG.";
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

export function useImageUpload(csrf: string) {
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
    const photo = await shrinkPhoto(file);
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

export function UploadButton({
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

export function UploadStatus({ state }: { state: UploadState }) {
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

type PickerState =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "open"; photos: LibraryPhoto[] }
  | { kind: "error"; message: string };

// "Choose from your photos": the library, fetched when the button is
// pressed, as a panel of thumbnails under the field.
function PhotoPicker({
  csrf,
  disabled,
  onPick,
}: {
  csrf: string;
  disabled: boolean;
  onPick: (photo: Uploaded) => void;
}) {
  const [state, setState] = useState<PickerState>({ kind: "closed" });

  async function open() {
    setState({ kind: "loading" });
    let res: Response;
    try {
      res = await fetch("/api/media/list", {
        headers: { "x-csrf-token": csrf },
        credentials: "same-origin",
        cache: "no-store",
      });
    } catch {
      setState({ kind: "error", message: NOT_REACHED });
      return;
    }
    if (res.status === 401 || res.status === 403) {
      setState({ kind: "error", message: SIGNED_OUT });
      return;
    }
    const photos = res.ok ? ((await res.json().catch(() => null)) as LibraryPhoto[] | null) : null;
    if (!Array.isArray(photos)) {
      setState({ kind: "error", message: "Your photos couldn't be loaded. Try again." });
      return;
    }
    setState({ kind: "open", photos });
  }

  const shown = state.kind === "open" || state.kind === "loading";
  return (
    <>
      <button
        type="button"
        className="admin-btn"
        disabled={disabled || state.kind === "loading"}
        aria-expanded={shown}
        onClick={() => (state.kind === "open" ? setState({ kind: "closed" }) : open())}
      >
        {state.kind === "loading" ? "Loading your photos…" : "Choose from your photos"}
      </button>
      {state.kind === "error" && <p className="admin-error admin-picker-note">{state.message}</p>}
      {state.kind === "open" && (
        <div className="admin-photo-picker" role="group" aria-label="Your photos">
          {state.photos.length === 0 ? (
            <p className="admin-muted">No photos yet. Upload one first.</p>
          ) : (
            <ul className="admin-photo-grid">
              {state.photos.map((photo) => (
                <li key={photo.src}>
                  <button
                    type="button"
                    className="admin-photo-choice"
                    onClick={() => {
                      setState({ kind: "closed" });
                      onPick({ src: photo.src, width: photo.width, height: photo.height });
                    }}
                  >
                    <span className="admin-photo-thumb">
                      <Image src={photo.src} alt="" fill sizes="10rem" className="admin-image" />
                    </span>
                    <span className="admin-photo-meta">
                      {photo.used_on.length > 0 ? photo.used_on.join(", ") : "Not used yet"}
                      <span className="sr-only">, added {formatWhen(photo.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="admin-btn admin-btn--quiet"
            onClick={() => setState({ kind: "closed" })}
          >
            Close
          </button>
        </div>
      )}
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
  const busy = state.kind === "preparing" || state.kind === "uploading";
  const latest = useLatest({ value, onChange });
  // Without alt the value is a plain string, so issues point at the path.
  const plainError = useIssue(withAlt ? undefined : path);

  function apply(done: Uploaded) {
    const { value, onChange } = latest.current;
    onChange(
      withAlt
        ? { ...value, src: done.src, width: done.width, height: done.height, alt: value?.alt ?? "" }
        : { src: done.src },
    );
  }

  async function onFile(file: File) {
    const done = await upload(file);
    if (done) apply(done);
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
        <PhotoPicker csrf={csrf} disabled={busy} onPick={apply} />
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

  function add(done: Uploaded) {
    const { items, onChange } = latest.current;
    if (items.some((i) => i.src === done.src)) {
      fail("That photo is already here.");
      return;
    }
    onChange([...items, { src: done.src, width: done.width, height: done.height, alt: "" }]);
  }

  async function onFile(file: File) {
    const done = await upload(file);
    if (done) add(done);
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
        <PhotoPicker
          csrf={csrf}
          disabled={state.kind === "preparing" || state.kind === "uploading"}
          onPick={add}
        />
      </div>
      <UploadStatus state={state} />
    </div>
  );
}
