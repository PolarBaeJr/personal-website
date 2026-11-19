"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

// The buttons inside a plain server-component form: the first press asks in
// the page (never a browser pop-up), the second submits.
export function ConfirmButtons({
  label,
  confirmText,
  confirmLabel,
}: {
  label: string;
  confirmText: string;
  confirmLabel: string;
}) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();

  if (!asking) {
    return (
      <button type="button" className="admin-btn" onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="admin-confirm" role="group" aria-label={confirmText}>
      <span>{confirmText}</span>
      <button type="submit" className="admin-btn admin-btn--danger" disabled={pending}>
        {pending ? "Working…" : confirmLabel}
      </button>
      <button
        type="button"
        className="admin-btn admin-btn--quiet"
        disabled={pending}
        onClick={() => setAsking(false)}
      >
        Cancel
      </button>
    </span>
  );
}
