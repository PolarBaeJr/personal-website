import type { Metadata } from "next";
import { ProjectList } from "@/components/ProjectList";
import { projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Projects",
};

export default function ProjectsPage() {
  return (
    <div className="flow">
      <h1>Projects</h1>
      <ProjectList projects={projects} headingLevel="h2" />
    </div>
  );
}
