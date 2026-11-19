import type { Metadata } from "next";
import Link from "next/link";
import { loadPosts, loadRecentChanges, loadSection } from "@/lib/admin/data";
import { actorLabel, formatWhen, sectionLabel } from "@/lib/admin/fields";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Dashboard",
};

const PLACES = [
  {
    href: "/admin/site",
    title: "About you and contact details",
    text: "Tagline, about text, status line, emails and links.",
  },
  { href: "/admin/home", title: "Home page", text: "Featured projects, experience and the T-account." },
  { href: "/admin/about", title: "About page", text: "Clubs, competitions, hobbies and testimonials." },
  { href: "/admin/projects", title: "Projects", text: "Add, edit, reorder or hide projects." },
  { href: "/admin/posts", title: "Blog posts", text: "Write, edit and delete posts." },
  { href: "/admin/socials", title: "Links page", text: "The rows on /socials." },
  { href: "/admin/resume", title: "Résumés", text: "Versions and PDFs." },
];

function historyHref(section: string): string {
  return section.startsWith("post:")
    ? `/admin/posts/${section.slice("post:".length)}/history`
    : `/admin/${section}/history`;
}

export default async function Dashboard() {
  await requireOwner();
  const recent = loadRecentChanges(12);
  const draftProjects = loadSection("projects").data.projects.filter((p) => p.draft && !p.hidden);
  const draftPosts = loadPosts().filter((post) => post.data.draft);

  return (
    <>
      <div className="admin-page-head">
        <h1 className="admin-title">Your site</h1>
        <p className="admin-intro">
          Pick what to change. Saves go live straight away, and every save is kept
          in the history, so you can always go back.
        </p>
      </div>

      <nav aria-label="Sections">
        <ul className="admin-cards">
          {PLACES.map((place) => (
            <li key={place.href}>
              <Link href={place.href} className="admin-card">
                <span className="admin-card-title">{place.title}</span>
                <span className="admin-card-text">{place.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="admin-section" aria-labelledby="drafts-title">
        <h2 id="drafts-title">Drafts</h2>
        {draftProjects.length === 0 && draftPosts.length === 0 ? (
          <p className="admin-muted">No drafts. Everything is published.</p>
        ) : (
          <ul className="admin-table">
            {draftProjects.map((p) => (
              <li key={`project-${p.slug}`} className="admin-table-row">
                <div className="admin-table-main">
                  <span className="admin-table-title">{p.title}</span>
                  <span className="admin-table-meta">Project</span>
                </div>
                <div className="admin-table-actions">
                  <Link href={`/admin/projects?open=${p.slug}`} className="admin-btn">
                    Edit<span className="sr-only"> {p.title}</span>
                  </Link>
                </div>
              </li>
            ))}
            {draftPosts.map((post) => (
              <li key={`post-${post.slug}`} className="admin-table-row">
                <div className="admin-table-main">
                  <span className="admin-table-title">{post.data.title}</span>
                  <span className="admin-table-meta">Blog post, {post.data.date}</span>
                </div>
                <div className="admin-table-actions">
                  <Link href={`/admin/posts/${post.slug}`} className="admin-btn">
                    Edit<span className="sr-only"> {post.data.title}</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-section" aria-labelledby="recent-title">
        <h2 id="recent-title">Recent changes</h2>
        <ul className="admin-table">
          {recent.map((change) => (
            <li key={`${change.section}-${change.versionNo}`} className="admin-table-row">
              <div className="admin-table-main">
                <span className="admin-table-title">{sectionLabel(change.section)}</span>
                <span className="admin-table-meta">
                  {formatWhen(change.createdAt)}, by {actorLabel(change.actor)}
                </span>
                {change.note && <span>{change.note}</span>}
              </div>
              <div className="admin-table-actions">
                <Link href={historyHref(change.section)} className="admin-btn">
                  History<span className="sr-only"> of {sectionLabel(change.section)}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
