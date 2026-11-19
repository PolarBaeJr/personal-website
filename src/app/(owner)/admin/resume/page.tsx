import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { formatWhen } from "@/lib/admin/fields";
import { requireOwner } from "@/lib/owner";
import { getVariantMeta } from "@/lib/resume";
import { ensureSeeded, getWriteDb } from "@/lib/resume-data";
import { listCurrent } from "@/lib/resume-store/db";

export const metadata: Metadata = {
  title: "Résumés",
};

export default async function AdminResumesPage() {
  await requireOwner();
  await ensureSeeded();
  const rows = listCurrent(getWriteDb());
  return (
    <>
      <AdminPageHead
        title="Résumés"
        intro="Each résumé's versions and PDFs. The text itself is still edited through the résumé tools."
        viewHref="/resume"
      />
      <ul className="admin-table">
        {rows.map(({ type, current, versionCount }) => (
          <li key={type} className="admin-table-row">
            <div className="admin-table-main">
              <span className="admin-table-title">{getVariantMeta(type).label}</span>
              <span className="admin-table-meta">
                {current
                  ? `Version ${current.versionNo} is live, saved ${formatWhen(current.createdAt)}. ${versionCount} versions in all.`
                  : "No version yet."}
              </span>
            </div>
            <div className="admin-table-actions">
              <Link href={`/admin/resume/${type}`} className="admin-btn">
                Open<span className="sr-only"> {getVariantMeta(type).label} résumé</span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
