import Link from "next/link";
import type { Project } from "@/content/projects";

type Props = {
  projects: Project[];
  headingLevel?: "h2" | "h3";
};

const categories: Record<Project["category"], { label: string; tone: string }> =
  {
    accounting: { label: "Accounting", tone: "cobalt" },
    tech: { label: "Tech", tone: "teal" },
    other: { label: "Other", tone: "slate" },
  };

export function ProjectList({ projects, headingLevel = "h3" }: Props) {
  if (projects.length === 0) {
    return <p className="text-slate">No projects yet.</p>;
  }

  const Heading = headingLevel;

  return (
    <ul className="row-list">
      {projects.map((project) => {
        const category = categories[project.category];
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
              <span className={`pill pill--${category.tone}`}>
                {category.label}
              </span>
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
          </li>
        );
      })}
    </ul>
  );
}
