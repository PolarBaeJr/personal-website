"use client";

import { useRef, useState } from "react";
import { MAX_ORIGINAL_BYTES, UPLOAD_LINK_CLOSED } from "@/lib/media/limits";
import { shrinkPhoto } from "@/lib/media/shrink-client";

// The one-time upload link page: pick a photo, it is shrunk on the device
// and sent with the link's token. The original file name never leaves the
// device.

type State =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "uploading" }
  | { kind: "done" }
  | { kind: "closed" }
  | { kind: "error"; message: string };

const NOT_REACHED = "The photo didn't reach the site. Check your connection and try again.";

export function UploadLinkForm({ token }: { token: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });

  async function send(file: File) {
    if (file.size > MAX_ORIGINAL_BYTES) {
      setState({ kind: "error", message: "That photo is over 40 MB. Pick a smaller one." });
      return;
    }
    if (file.type && !file.type.startsWith("image/")) {
      setState({ kind: "error", message: "That isn't a photo." });
      return;
    }
    setState({ kind: "preparing" });
    const photo = await shrinkPhoto(file);
    if (!photo) {
      setState({ kind: "error", message: "This photo couldn't be read here. Try a JPEG or PNG." });
      return;
    }
    setState({ kind: "uploading" });
    const body = new FormData();
    body.append("file", photo, "photo");
    let res: Response;
    try {
      res = await fetch(`/api/upload/${encodeURIComponent(token)}`, {
        method: "POST",
        body,
        credentials: "omit",
      });
    } catch {
      setState({ kind: "error", message: NOT_REACHED });
      return;
    }
    if (res.status === 201) {
      setState({ kind: "done" });
      return;
    }
    if (res.status === 410) {
      setState({ kind: "closed" });
      return;
    }
    let message: string;
    if (res.status === 413) {
      message = "That photo is too large to send. Try a smaller one.";
    } else if (res.status === 415 || res.status === 400) {
      const data = (await res.json().catch(() => null)) as { message?: unknown } | null;
      message =
        typeof data?.message === "string" ? data.message : "That file couldn't be read as a photo.";
    } else if (res.status === 429) {
      message = "Too many tries. Wait 15 minutes, then try again.";
    } else if (res.status === 503) {
      message = "Busy with another photo. Try again in a moment.";
    } else {
      message = "The photo couldn't be saved. Try again.";
    }
    setState({ kind: "error", message });
  }

  if (state.kind === "done") {
    return (
      <p className="upload-link-done" role="status">
        Got it. Go back to Claude.
      </p>
    );
  }
  if (state.kind === "closed") {
    return <p role="status">{UPLOAD_LINK_CLOSED}</p>;
  }

  const busy = state.kind === "preparing" || state.kind === "uploading";
  return (
    <div className="admin-login-form">
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
          if (file) send(file);
        }}
      />
      <button
        type="button"
        className="btn btn--primary admin-btn upload-link-button"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {state.kind === "preparing" ? "Preparing…" : busy ? "Sending…" : "Choose a photo"}
      </button>
      <p className="admin-hint" role="status" aria-live="polite">
        {state.kind === "preparing"
          ? "Preparing the photo…"
          : state.kind === "uploading"
            ? "Sending the photo…"
            : ""}
      </p>
      {state.kind === "error" && (
        <p className="admin-error" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}
