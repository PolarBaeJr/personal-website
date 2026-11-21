import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditLink } from "@/components/EditLink";
import { RepoCard } from "@/components/RepoCard";
import { Skeleton } from "@/components/Skeleton";
import { projectsSeed, type Project } from "@/content/projects";
import { getProject } from "@/lib/content";
import { visibleProjects } from "@/lib/content-view";
import { parseGitHubRepo } from "@/lib/github";
import { getOwner } from "@/lib/owner";

const seedProjects = visibleProjects(projectsSeed);

// The live list is in the DB; any slug outside the seed renders on demand
// (the proxy has already 404'd unknown ones).
export function generateStaticParams() {
  const params = seedProjects.map((project) => ({ slug: project.slug }));
  // Must return at least one entry with Cache Components; the placeholder 404s.
  return params.length > 0 ? params : [{ slug: "__none__" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  await io();
  const project = await getProject(slug);
  if (!project) return {};
  return { title: project.title, description: project.summary };
}

type ProjectImage = NonNullable<Project["images"]>[number];

const SHOT_SIZES = "(max-width: 48rem) 100vw, 48rem";

// Natural ratio when the size is known; otherwise a fixed 16:10 frame.
function ProjectShot({ image, first }: { image: ProjectImage; first: boolean }) {
  if (image.width && image.height) {
    return (
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes={SHOT_SIZES}
        className="shot-image"
        preload={first}
      />
    );
  }
  return (
    <div className="shot-frame">
      <Image src={image.src} alt={image.alt} fill sizes={SHOT_SIZES} className="shot-frame-image" />
    </div>
  );
}

function ProjectBody({ project }: { project: Project }) {
  const githubLink = project.links.find((link) => link.kind === "github");
  const repo = githubLink ? parseGitHubRepo(githubLink.href) : null;
  const buttonLinks = repo
    ? project.links.filter((link) => link !== githubLink)
    : project.links;

  return (
    <>
      <h1 className="page-title">
        {project.title}
        {project.draft && <span className="badge-draft">Draft</span>}
      </h1>
      <p className="lede">{project.description}</p>
      {project.tags.length > 0 && (
        <ul className="pill-list">
          {project.tags.map((tag) => (
            <li key={tag} className="pill pill--slate">
              {tag}
            </li>
          ))}
        </ul>
      )}
      {buttonLinks.length > 0 && (
        <div className="btn-row">
          {buttonLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={
                link.kind === "live"
                  ? "btn btn--primary"
                  : "btn btn--outline"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.kind === "live" ? "Visit site" : "View on GitHub"}
            </a>
          ))}
        </div>
      )}
      {project.images && project.images.length > 0 && (
        <ul className="shot-list" aria-label="Screenshots">
          {project.images.map((img, i) => (
            <li key={img.src}>
              <ProjectShot image={img} first={i === 0} />
            </li>
          ))}
        </ul>
      )}
      {repo && githubLink && (
        <RepoCard
          owner={repo.owner}
          repo={repo.repo}
          href={githubLink.href}
          summary={project.summary}
        />
      )}
    </>
  );
}

async function LiveProjectBody({ slug }: { slug: string }) {
  await io();
  const owner = await getOwner();
  const project = await getProject(slug, !!owner);
  // Backstop only: the proxy 404s unknown slugs before rendering starts.
  if (!project) notFound();
  return (
    <>
      <ProjectBody project={project} />
      <EditLink href={`/admin/projects?open=${slug}`} label="Edit this project" />
    </>
  );
}

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[slug]">) {
  const { slug } = await params;

  return (
    <article className="flow">
      <p>
        <Link href="/projects" className="text-link">
          All projects
        </Link>
      </p>
      <Suspense fallback={<Skeleton lines={5} />}>
        <LiveProjectBody slug={slug} />
      </Suspense>
    </article>
  );
}
