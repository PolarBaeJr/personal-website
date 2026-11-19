import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { HomeEditor } from "@/components/admin/HomeEditor";
import { loadSection } from "@/lib/admin/data";
import { experienceKey } from "@/lib/content-view";
import { requireOwner } from "@/lib/owner";
import { getResume } from "@/lib/resume";

export const metadata: Metadata = {
  title: "Home page",
};

export default async function AdminHomePage() {
  const owner = await requireOwner();
  const { data, version } = loadSection("home");
  const projects = loadSection("projects").data.projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    draft: p.draft,
    hidden: p.hidden === true,
  }));
  const { experience } = await getResume("general");
  const jobs = experience.map((job) => ({
    key: experienceKey(job),
    label: `${job.role}, ${job.org} (${job.start})`,
  }));
  return (
    <>
      <AdminPageHead
        title="Home page"
        intro="Featured projects, experience and the T-account. The intro text is under About you and contact details."
        viewHref="/"
        historyHref="/admin/home/history"
      />
      <HomeEditor
        initial={data}
        version={version}
        csrf={owner.csrf}
        projects={projects}
        jobs={jobs}
      />
    </>
  );
}
