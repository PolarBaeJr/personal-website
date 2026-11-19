import type { Metadata } from "next";
import { AdminPageHead } from "@/components/admin/AdminPageHead";
import { ProjectsEditor } from "@/components/admin/ProjectsEditor";
import { loadSection } from "@/lib/admin/data";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function AdminProjectsPage({
  searchParams,
}: PageProps<"/admin/projects">) {
  const owner = await requireOwner();
  const { open } = await searchParams;
  const { data, version } = loadSection("projects");
  return (
    <>
      <AdminPageHead
        title="Projects"
        intro="Add, edit, reorder or hide projects. Which ones show on the home page is set under Home page."
        viewHref="/projects"
        historyHref="/admin/projects/history"
      />
      <ProjectsEditor
        initial={data}
        version={version}
        csrf={owner.csrf}
        openSlug={typeof open === "string" ? open : undefined}
      />
    </>
  );
}
