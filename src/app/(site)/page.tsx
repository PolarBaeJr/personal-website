import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExperienceRows } from "@/components/ExperienceRows";
import { ProjectList } from "@/components/ProjectList";
import { TAccount } from "@/components/TAccount";
import { getFeaturedProjects } from "@/content/projects";
import { site } from "@/content/site";
import { getResume } from "@/lib/resume";

export const metadata: Metadata = {
  title: { absolute: site.name },
};

export default function Home() {
  const { experience } = getResume("general");
  // T-account item count, set on the section so the .home-experience
  // animation-delay in CSS can wait until the T-account has finished.
  const taItems = site.balance.accounting.length + site.balance.building.length;

  return (
    <div className="stack">
      <section className="flow">
        <h1 className="display">{site.name}</h1>
        <p className="lede">{site.tagline}</p>
        <p className="text-slate">{site.location}</p>
        <div className="btn-row">
          <Link href="/resume" className="btn btn--primary">
            View résumé
          </Link>
          <a href={`mailto:${site.email}`} className="btn btn--outline">
            Get in touch
          </a>
        </div>
        <TAccount />
      </section>

      <section
        className="flow home-experience"
        style={{ "--ta-items": taItems } as CSSProperties}
      >
        <div className="section-head">
          <h2>Experience</h2>
          <Link href="/resume" className="text-link">
            Full résumé
          </Link>
        </div>
        <ExperienceRows experience={experience} />
      </section>

      <section className="flow">
        <div className="section-head">
          <h2>Featured projects</h2>
          <Link href="/projects" className="text-link">
            All projects
          </Link>
        </div>
        <ProjectList projects={getFeaturedProjects()} />
      </section>

      <section className="flow">
        <h2>About</h2>
        {site.about.map((paragraph) => (
          <p key={paragraph} className="measure">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="flow">
        <h2>Get in touch</h2>
        <p className="lede">Email is the fastest way to reach me.</p>
        <div className="btn-row">
          <a href={`mailto:${site.email}`} className="btn btn--primary">
            Email me
          </a>
          {site.links.map((link) => (
            <a key={link.href} href={link.href} className="btn btn--outline">
              {link.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
