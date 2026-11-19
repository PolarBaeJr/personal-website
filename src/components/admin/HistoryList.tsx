import Link from "next/link";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { actorLabel, formatWhen } from "@/lib/admin/fields";
import type { FormState } from "@/lib/admin/form-state";
import type { ContentMeta } from "@/lib/content-store/db";

// Every saved version, newest first, with View and "Restore this version".
export function HistoryList({
  versions,
  viewHref,
  restore,
  fields,
}: {
  versions: ContentMeta[];
  viewHref: (version: number) => string;
  restore: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
}) {
  if (versions.length === 0) return <p className="admin-muted">No saved versions yet.</p>;
  return (
    <ul className="admin-table">
      {versions.map((v) => (
        <li key={v.versionNo} className="admin-table-row">
          <div className="admin-table-main">
            <span className="admin-table-title">
              Version {v.versionNo}
              {v.isCurrent && <span className="admin-current"> (live now)</span>}
            </span>
            <span className="admin-table-meta">
              {formatWhen(v.createdAt)}, by {actorLabel(v.actor)}
            </span>
            {v.note && <span>{v.note}</span>}
          </div>
          <div className="admin-table-actions">
            <Link href={viewHref(v.versionNo)} className="admin-btn">
              View<span className="sr-only"> version {v.versionNo}</span>
            </Link>
            {!v.isCurrent && (
              <ConfirmForm
                action={restore}
                fields={{ ...fields, version: String(v.versionNo) }}
                label="Restore this version"
                confirmText={`Make version ${v.versionNo} live again? Your current version stays in the history.`}
                confirmLabel="Yes, restore"
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
