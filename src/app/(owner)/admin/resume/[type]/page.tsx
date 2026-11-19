import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { ConfirmForm } from "@/components/admin/ConfirmForm";
import { rebuildResumeAction, restoreResumeAction } from "@/app/(owner)/admin/actions";
import { formatWhen } from "@/lib/admin/fields";
import { requireOwner } from "@/lib/owner";
import { getVariantMeta } from "@/lib/resume";
import { ensureSeeded, getWriteDb } from "@/lib/resume-data";
import { listVersions } from "@/lib/resume-store/db";
import { isResumeType } from "@/lib/resume-types";

export const metadata: Metadata = {
  title: "Résumé",
};

export default async function AdminResumePage({ params }: PageProps<"/admin/resume/[type]">) {
  const owner = await requireOwner();
  const { type } = await params;
  if (!isResumeType(type)) notFound();
  await ensureSeeded();
  const versions = listVersions(getWriteDb(), type);
  const label = getVariantMeta(type).label;
  const pdf = (v: number, variant: "public" | "private") =>
    `/admin/resume/${type}/versions/${v}/pdf?variant=${variant}`;

  return (
    <>
      <AdminPageHead
        title={`${label} résumé`}
        back={{ href: "/admin/resume", label: "Résumés" }}
        viewHref={`/resume/${type}`}
      >
        <a href={`/resume/${type}/document`} className="admin-btn">
          Public PDF
        </a>
        <ConfirmForm
          action={rebuildResumeAction}
          fields={{ csrf: owner.csrf, type }}
          label="Rebuild PDF"
        />
      </AdminPageHead>
      <p className="admin-muted">
        Rebuild PDF makes the live version&apos;s PDFs again, for example after your
        phone number or address changes on the server. It doesn&apos;t add a version.
        The private PDF has your phone number and address; it is only for you.
      </p>
      <section className="admin-section" aria-labelledby="versions-title">
        <h2 id="versions-title">Versions</h2>
        <ul className="admin-table">
          {versions.map((v) => (
            <li key={v.versionNo} className="admin-table-row">
              <div className="admin-table-main">
                <span className="admin-table-title">
                  Version {v.versionNo}
                  {v.isCurrent && <span className="admin-current"> (live now)</span>}
                </span>
                <span className="admin-table-meta">
                  {formatWhen(v.createdAt)}
                  {v.source === "import" ? ", an uploaded PDF" : ""}
                </span>
                {v.note && <span>{v.note}</span>}
              </div>
              <div className="admin-table-actions">
                {v.hasPdfPublic && (
                  <a href={pdf(v.versionNo, "public")} className="admin-btn">
                    Public PDF<span className="sr-only"> of version {v.versionNo}</span>
                  </a>
                )}
                {v.hasPdfPrivate && (
                  <a href={pdf(v.versionNo, "private")} className="admin-btn">
                    Private PDF<span className="sr-only"> of version {v.versionNo}</span>
                  </a>
                )}
                {!v.isCurrent && v.hasTex && (
                  <ConfirmForm
                    action={restoreResumeAction}
                    fields={{ csrf: owner.csrf, type, version: String(v.versionNo) }}
                    label="Make this the current version"
                    confirmText={`Make version ${v.versionNo} the live résumé? This can take a little while if its PDF needs building.`}
                    confirmLabel="Yes, make it current"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
