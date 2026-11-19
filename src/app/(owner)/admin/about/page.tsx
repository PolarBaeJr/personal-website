import type { Metadata } from "next";
import { AboutEditor } from "@/components/admin/AboutEditor";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { loadSection } from "@/lib/admin/data";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "About page",
};

export default async function AdminAboutPage() {
  const owner = await requireOwner();
  const { data, version } = loadSection("about");
  return (
    <>
      <AdminPageHead
        title="About page"
        intro="Clubs, competitions, hobbies and testimonials. The about text itself is under About you and contact details."
        viewHref="/about"
        historyHref="/admin/about/history"
      />
      <AboutEditor initial={data} version={version} csrf={owner.csrf} />
    </>
  );
}
