import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { SiteEditor } from "@/components/admin/SiteEditor";
import { loadSection } from "@/lib/admin/data";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "About you and contact details",
};

export default async function AdminSitePage() {
  const owner = await requireOwner();
  const { data, version } = loadSection("site");
  return (
    <>
      <AdminPageHead
        title="About you and contact details"
        intro="Your tagline, the about text, the status line, emails and links."
        viewHref="/about"
        historyHref="/admin/site/history"
      />
      <SiteEditor initial={data} version={version} csrf={owner.csrf} />
    </>
  );
}
