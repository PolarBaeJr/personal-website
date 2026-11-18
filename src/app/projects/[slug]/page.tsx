import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/content/projects";

export function generateStaticParams() {
  const params = projects.map((project) => ({ slug: project.slug }));
  // Must return at least one entry with Cache Components; the placeholder 404s.
  return params.length > 0 ? params : [{ slug: "__none__" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return { title: project.title, description: project.summary };
}

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <article className="flow">
      <p>
        <Link href="/projects">← All projects</Link>
      </p>
      <h1>
        {project.title}
        {project.draft && <span className="badge">Draft</span>}
      </h1>
      <p>{project.description}</p>
      {project.tags.length > 0 && (
        <ul className="link-list text-muted">
          {project.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
      {project.links.length > 0 && (
        <ul className="link-list">
          {project.links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
