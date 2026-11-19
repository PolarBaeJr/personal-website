"use client";

import { useId } from "react";
import { describePath, friendlyMessage } from "@/lib/admin/fields";
import type { FormState } from "@/lib/admin/form-state";

// Sticky at the bottom of an editor: an optional note for the history, the
// Save button, and what happened last time.
export function SaveBar({
  state,
  pending,
  dirty,
  note,
  onNoteChange,
  saveLabel = "Save",
}: {
  state: Omit<FormState, "version">;
  pending: boolean;
  dirty: boolean;
  note: string;
  onNoteChange: (note: string) => void;
  saveLabel?: string;
}) {
  const noteId = useId();
  let status: string;
  if (pending) status = "Saving…";
  else if (state.ok === false) status = state.message ?? "Not saved.";
  else if (dirty) status = "You have unsaved changes.";
  else if (state.ok) status = state.message ?? "Saved.";
  else status = "No changes yet.";

  return (
    <div className="admin-savebar">
      <div className="admin-savebar-inner">
        <div className="admin-savebar-note">
          <label htmlFor={noteId} className="admin-label">
            What changed? <span className="admin-muted">(optional note for your history)</span>
          </label>
          <input
            id={noteId}
            name="note"
            className="admin-input"
            value={note}
            maxLength={500}
            autoComplete="off"
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="btn btn--primary admin-btn"
          disabled={pending || !dirty}
        >
          {pending ? "Saving…" : saveLabel}
        </button>
      </div>
      <p
        className={state.ok === false && !pending ? "admin-savebar-status admin-error" : "admin-savebar-status"}
        role="status"
      >
        {status}
      </p>
      {!pending && state.issues && state.issues.length > 0 && (
        <ul className="admin-issues">
          {state.issues.map((issue) => (
            <li key={`${issue.path}|${issue.message}`}>
              {describePath(issue.path)}: {friendlyMessage(issue.message)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
