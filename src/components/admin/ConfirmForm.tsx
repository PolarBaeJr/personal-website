"use client";

import { useActionState, useState } from "react";
import { NOT_REACHED, type FormState } from "@/lib/admin/form-state";

// A one-button form for restore, delete and rebuild. With confirmText, the
// button first asks in the page (never a browser pop-up).
export function ConfirmForm({
  action,
  fields,
  label,
  confirmText,
  confirmLabel = "Yes",
  danger = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
  label: string;
  confirmText?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      try {
        return await action(prev, formData);
      } catch {
        return { ok: false, message: NOT_REACHED };
      }
    },
    {},
  );
  const [asking, setAsking] = useState(false);

  return (
    <form action={formAction} className="admin-confirm">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {confirmText && !asking ? (
        <button type="button" className="admin-btn" onClick={() => setAsking(true)}>
          {label}
        </button>
      ) : confirmText ? (
        <span className="admin-confirm" role="group" aria-label={confirmText}>
          <span>{confirmText}</span>
          <button
            type="submit"
            className={danger ? "admin-btn admin-btn--danger" : "btn btn--primary admin-btn"}
            disabled={pending}
          >
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
      ) : (
        <button type="submit" className="admin-btn" disabled={pending}>
          {pending ? "Working…" : label}
        </button>
      )}
      {state.message && !pending && (
        <span className={state.ok ? "admin-muted" : "admin-error"} role="status">
          {state.message}
        </span>
      )}
    </form>
  );
}
