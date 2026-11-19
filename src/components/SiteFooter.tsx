import Link from "next/link";
import { ContactLinks } from "@/components/ContactLinks";
import { projects } from "@/content/projects";
import { nav, site } from "@/content/site";

const pages = [...nav, { label: "Socials", href: "/socials" }];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-width">
        <p className="footer-total">Balance carried forward</p>
      </div>
      <div className="site-width footer-grid">
        <div className="footer-group">
          <p className="footer-name">{site.name}</p>
          {site.footerLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <nav className="footer-group" aria-label="Footer">
          <h2 className="footer-heading">Pages</h2>
          <ul className="footer-list">
            {pages.map((item) => (
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
            {projects
              .filter((project) => !project.draft)
              .map((project) => (
                <li key={project.slug}>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="footer-link"
                  >
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
          <ContactLinks className="footer-list" linkClassName="footer-link" />
        </div>
      </div>
    </footer>
  );
}
