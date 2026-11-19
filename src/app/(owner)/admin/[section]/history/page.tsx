import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { HistoryList } from "@/components/admin/HistoryList";
import { ReadableData } from "@/components/admin/ReadableData";
import { restoreSectionAction } from "@/app/(owner)/admin/actions";
import { loadHistory, loadVersion } from "@/lib/admin/data";
import { actorLabel, formatWhen, sectionLabel } from "@/lib/admin/fields";
import { isSectionName } from "@/lib/content-store/schema";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "History",
};

export default async function SectionHistoryPage({
  params,
  searchParams,
}: PageProps<"/admin/[section]/history">) {
  const owner = await requireOwner();
  const { section } = await params;
  if (!isSectionName(section)) notFound();
  const { v } = await searchParams;
  const viewing =
    typeof v === "string" && /^[1-9]\d{0,8}$/.test(v) ? loadVersion(section, Number(v)) : undefined;
  const versions = loadHistory(section);

  return (
    <>
      <AdminPageHead
        title={`History: ${sectionLabel(section)}`}
        intro="Every save is kept. Restoring copies an old version into a new live one."
        back={{ href: `/admin/${section}`, label: sectionLabel(section) }}
      />
      {viewing && (
        <section className="admin-section" aria-labelledby="viewing-title">
          <h2 id="viewing-title">
            Version {viewing.meta.versionNo}, {formatWhen(viewing.meta.createdAt)}, by{" "}
            {actorLabel(viewing.meta.actor)}
          </h2>
          <ReadableData data={viewing.data} />
        </section>
      )}
      <HistoryList
        versions={versions}
        viewHref={(n) => `/admin/${section}/history?v=${n}`}
        restore={restoreSectionAction}
        fields={{ csrf: owner.csrf, section }}
      />
    </>
  );
}
