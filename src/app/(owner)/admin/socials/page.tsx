import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { SocialsEditor } from "@/components/admin/SocialsEditor";
import { loadSection } from "@/lib/admin/data";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Links page",
};

export default async function AdminSocialsPage() {
  const owner = await requireOwner();
  const { data, version } = loadSection("socials");
  return (
    <>
      <AdminPageHead
        title="Links page"
        intro="The rows on your link-in-bio page."
        viewHref="/socials"
        historyHref="/admin/socials/history"
      />
      <SocialsEditor initial={data} version={version} csrf={owner.csrf} />
    </>
  );
}
