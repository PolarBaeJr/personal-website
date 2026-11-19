import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import Link from "next/link";
import { TestimonialsSection } from "@/components/AboutSections";
import { ExperienceRows } from "@/components/ExperienceRows";
import { ProjectList } from "@/components/ProjectList";
import { ScrollReveal } from "@/components/ScrollReveal";
import { TAccount } from "@/components/TAccount";
import { getFeaturedProjects } from "@/content/projects";
import { site } from "@/content/site";
import { getResume } from "@/lib/resume";

export const metadata: Metadata = {
  title: { absolute: site.name },
};

async function HomeExperience({ revealDelayMs }: { revealDelayMs: number }) {
  await io();
  const { experience } = await getResume("general");
  return (
    <ScrollReveal initialDelayMs={revealDelayMs}>
      <ExperienceRows experience={experience} />
    </ScrollReveal>
  );
}

export default function Home() {
  // T-account item count, set on the section so the .home-experience
  // animation-delay in CSS can wait until the T-account has finished.
  const taItems = site.balance.accounting.length + site.balance.building.length;
  const now = site.now?.trim();
  // Lines already on screen start revealing just after the section itself
  // has faded in (matches the .home-experience animation-delay in CSS).
  const revealDelayMs = 1300 + (taItems - 1) * 70 + 300;

  return (
    <div className="stack">
      <section className="flow">
        <h1 className="display">Hey, I&apos;m {site.name.split(" ")[0]}.</h1>
        <p className="lede measure">{site.about.join(" ")}</p>
        {now ? (
          <p className="now-line">
            <span className="now-label">Now</span>
            <span>{now}</span>
          </p>
        ) : null}
        <ul className="hero-facts" aria-label="At a glance">
          {[site.location, ...site.focus].map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <div className="btn-row">
          <Link href="/resume" className="btn btn--primary">
            View résumé
          </Link>
          <Link href="/contact" className="btn btn--outline">
            Get in touch
          </Link>
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
        <Suspense fallback={<p className="text-slate">Loading…</p>}>
          <HomeExperience revealDelayMs={revealDelayMs} />
        </Suspense>
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

      <TestimonialsSection />


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
