import Link from "next/link";
import type { Project } from "@/content/projects";

type Props = {
  projects: Project[];
  headingLevel?: "h2" | "h3";
};

export function ProjectList({ projects, headingLevel = "h3" }: Props) {
  if (projects.length === 0) {
    return <p className="text-muted">No projects yet.</p>;
  }

  const Heading = headingLevel;

  return (
    <ul className="card-list">
      {projects.map((project) => (
        <li key={project.slug} className="card flow">
          <Heading>
            <Link href={`/projects/${project.slug}`}>{project.title}</Link>
            {project.draft && <span className="badge">Draft</span>}
          </Heading>
          <p>{project.summary}</p>
        </li>
      ))}
    </ul>
  );
}
