import { Suspense } from "react";
import { io } from "next/cache";
import Link from "next/link";
import { ContactLinks } from "@/components/ContactLinks";
import { Skeleton } from "@/components/Skeleton";
import type { Project } from "@/content/projects";
import { navPages, siteIdentity, type Site } from "@/content/site";
import { getProjects, getSite } from "@/lib/content";

function FooterBody({ site, projects }: { site: Site; projects: Project[] }) {
  return (
    <div className="site-width footer-grid">
      <div className="footer-group">
        <p className="footer-name">{siteIdentity.name}</p>
        {site.footerLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <nav className="footer-group" aria-label="Footer">
        <h2 className="footer-heading">Pages</h2>
        <ul className="footer-list">
          {navPages.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="footer-link">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="footer-group">
        <h2 className="footer-heading">Projects</h2>
        <ul className="footer-list">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link href={`/projects/${project.slug}`} className="footer-link">
                {project.title}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/projects" className="footer-link">
              All projects
            </Link>
          </li>
        </ul>
      </div>

      <div className="footer-group">
        <h2 className="footer-heading">Contact</h2>
        <ContactLinks
          emails={site.emails}
          links={site.links}
          className="footer-list"
          linkClassName="footer-link"
        />
      </div>
    </div>
  );
}

async function LiveFooterBody() {
  await io();
  const [site, projects] = await Promise.all([getSite(), getProjects()]);
  return <FooterBody site={site} projects={projects} />;
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-width">
        <p className="footer-total">Balance carried forward</p>
      </div>
      {/* No seed content in the fallback: hidden items must never reach the static shell. */}
      <Suspense
        fallback={
          <div className="site-width">
            <Skeleton lines={6} minHeight="12rem" />
          </div>
        }
      >
        <LiveFooterBody />
      </Suspense>
    </footer>
  );
}
