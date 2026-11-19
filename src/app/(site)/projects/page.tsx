import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import { ProjectList } from "@/components/ProjectList";
import { Skeleton } from "@/components/Skeleton";
import { getProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
};

async function LiveProjectList() {
  await io();
  return <ProjectList projects={await getProjects()} headingLevel="h2" />;
}

export default function ProjectsPage() {
  return (
    <div className="flow">
      <h1 className="page-title">Projects</h1>
      <Suspense fallback={<Skeleton lines={8} />}>
        <LiveProjectList />
      </Suspense>
    </div>
  );
}
