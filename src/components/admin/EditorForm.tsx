"use client";

import { useState, type ReactNode } from "react";
import { IssuesProvider } from "@/components/admin/FormIssues";
import { SaveBar } from "@/components/admin/SaveBar";
import type { SaveFormHandle } from "@/components/admin/useSaveForm";

// The <form> around an editor: hidden fields for the save, the fields
// themselves, an optional live preview (beside the form on wide screens,
// behind a "Preview" toggle on phones) and the save bar.
export function EditorForm({
  form,
  csrf,
  hidden,
  preview,
  saveLabel,
  children,
}: {
  form: SaveFormHandle;
  csrf: string;
  hidden: Record<string, string>;
  preview?: ReactNode;
  saveLabel?: string;
  children: ReactNode;
}) {
  const [showPreview, setShowPreview] = useState(false);
  return (
    <form action={form.formAction} className="admin-editor-form">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="data" value={form.json} />
      <input type="hidden" name="baseVersion" value={form.baseVersion ?? ""} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <IssuesProvider value={form.state.issues ?? []}>
        <div className={preview ? "admin-editor admin-editor--preview" : "admin-editor"}>
          <div className="admin-editor-fields">{children}</div>
          {preview && (
            <aside className="admin-preview-column" aria-label="Preview">
              <button
                type="button"
                className="admin-btn admin-preview-toggle"
                aria-expanded={showPreview}
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Hide preview" : "Preview"}
              </button>
              <div className="admin-preview" data-open={showPreview ? "" : undefined}>
                <p className="admin-preview-label">Preview (not saved yet)</p>
                {preview}
              </div>
            </aside>
          )}
        </div>
      </IssuesProvider>
      <SaveBar
        state={form.state}
        pending={form.pending}
        dirty={form.dirty}
        note={form.note}
        onNoteChange={form.setNote}
        saveLabel={saveLabel}
      />
    </form>
  );
}
