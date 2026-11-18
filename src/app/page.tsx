import type { Metadata } from "next";
import Link from "next/link";
import { ProjectList } from "@/components/ProjectList";
import { getFeaturedProjects } from "@/content/projects";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: { absolute: site.name },
};

export default function Home() {
  return (
    <div className="stack">
      <section className="flow">
        <h1>{site.name}</h1>
        <p>{site.tagline}</p>
        <p>
          <Link href="/resume">View résumé</Link>
        </p>
      </section>

      <section className="flow">
        <h2>Featured projects</h2>
        <ProjectList projects={getFeaturedProjects()} />
        <p>
          <Link href="/projects">All projects →</Link>
        </p>
      </section>

      <section className="flow">
        <h2>About</h2>
        {site.about.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <section className="flow">
        <h2>Contact</h2>
        <ul className="link-list">
          {site.links.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
