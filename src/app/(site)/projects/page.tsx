import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { EditLink } from "@/components/EditLink";
import { ProjectList } from "@/components/ProjectList";
import { Skeleton } from "@/components/Skeleton";
import { getProjects } from "@/lib/content";
import { getOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Projects",
};

async function LiveProjectList() {
  await io();
  const owner = await getOwner();
  return <ProjectList projects={await getProjects(!!owner)} headingLevel="h2" />;
}

export default function ProjectsPage() {
  return (
    <div className="flow">
      <h1 className="page-title">Projects</h1>
      <EditLink href="/admin/projects" label="Edit projects" />
      <Suspense fallback={<Skeleton lines={8} />}>
        <LiveProjectList />
      </Suspense>
    </div>
  );
}
