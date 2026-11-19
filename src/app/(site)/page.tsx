import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import Link from "next/link";
import { TestimonialsSection } from "@/components/AboutSections";
import { ExperienceRows } from "@/components/ExperienceRows";
import { ProjectList } from "@/components/ProjectList";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Skeleton } from "@/components/Skeleton";
import { TAccount } from "@/components/TAccount";
import type { Home as HomeData } from "@/content/home";
import { siteIdentity, type Site } from "@/content/site";
import { getFeaturedProjects, getHome, getSite } from "@/lib/content";
import { homeExperience } from "@/lib/content-view";
import { getResume } from "@/lib/resume";

export const metadata: Metadata = {
  title: { absolute: siteIdentity.name },
};

// Every hole below falls back to an empty Skeleton, never the seed: an item
// hidden in the DB must not reach the static shell.

function Intro({ site, home }: { site: Site; home: HomeData }) {
  const now = site.now?.trim();
  return (
    <>
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
      <TAccount balance={home.balance} />
    </>
  );
}

async function LiveIntro() {
  await io();
  const [site, home] = await Promise.all([getSite(), getHome()]);
  return <Intro site={site} home={home} />;
}

// T-account item count, set on the section so the .home-experience
// animation-delay in CSS can wait until the T-account has finished.
function ExperienceSection({
  taItems,
  children,
}: {
  taItems: number;
  children: React.ReactNode;
}) {
  return (
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
      {children}
    </section>
  );
}

async function LiveExperience() {
  await io();
  const [home, { experience }] = await Promise.all([
    getHome(),
    getResume("general"),
  ]);
  const taItems = home.balance.accounting.length + home.balance.building.length;
  // Lines already on screen start revealing just after the section itself
  // has faded in (matches the .home-experience animation-delay in CSS).
  const revealDelayMs = 1300 + (taItems - 1) * 70 + 300;
  return (
    <ExperienceSection taItems={taItems}>
      <ScrollReveal initialDelayMs={revealDelayMs}>
        <ExperienceRows experience={homeExperience(home, experience)} />
      </ScrollReveal>
    </ExperienceSection>
  );
}

function FeaturedProjects({ children }: { children: React.ReactNode }) {
  return (
    <section className="flow">
      <div className="section-head">
        <h2>Featured projects</h2>
        <Link href="/projects" className="text-link">
          All projects
        </Link>
      </div>
      {children}
    </section>
  );
}

async function LiveFeaturedProjects() {
  await io();
  return <ProjectList projects={await getFeaturedProjects()} />;
}

async function GetInTouchButtons() {
  await io();
  const site = await getSite();
  return (
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
  );
}

export default function Home() {
  return (
    <div className="stack">
      <section className="flow">
        <h1 className="display">
          Hey, I&apos;m {siteIdentity.name.split(" ")[0]}.
        </h1>
        <Suspense fallback={<Skeleton lines={6} minHeight="24rem" />}>
          <LiveIntro />
        </Suspense>
      </section>

      <Suspense
        fallback={
          <ExperienceSection taItems={0}>
            <Skeleton lines={4} />
          </ExperienceSection>
        }
      >
        <LiveExperience />
      </Suspense>

      <FeaturedProjects>
        <Suspense fallback={<Skeleton lines={4} />}>
          <LiveFeaturedProjects />
        </Suspense>
      </FeaturedProjects>

      <Suspense fallback={null}>
        <TestimonialsSection />
      </Suspense>

      <section className="flow">
        <h2>Get in touch</h2>
        <p className="lede">Email is the fastest way to reach me.</p>
        <Suspense fallback={<Skeleton lines={1} />}>
          <GetInTouchButtons />
        </Suspense>
      </section>
    </div>
  );
}
