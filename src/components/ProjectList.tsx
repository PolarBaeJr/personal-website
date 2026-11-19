import Link from "next/link";
import type { Project } from "@/content/projects";

type Props = {
  projects: Project[];
  headingLevel?: "h2" | "h3";
};

export function ProjectList({ projects, headingLevel = "h3" }: Props) {
  if (projects.length === 0) {
    return <p className="text-slate">No projects yet.</p>;
  }

  const Heading = headingLevel;

  return (
    <ul className="row-list">
      {projects.map((project) => {
        return (
          <li key={project.slug} className="row">
            <Heading className="row-title">
              <Link
                href={`/projects/${project.slug}`}
                className="row-title-link"
              >
                {project.title}
              </Link>
              {project.draft && <span className="badge-draft">Draft</span>}
            </Heading>
            <div className="row-aside">
              {project.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="chip-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.kind === "github" ? "GitHub" : "Live"}
                </a>
              ))}
            </div>
            <p className="row-summary">{project.summary}</p>
            {project.tags.length > 0 && (
              <p className="row-tags">{project.tags.join(", ")}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
