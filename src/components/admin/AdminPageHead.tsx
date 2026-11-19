import type { ReactNode } from "react";
import Link from "next/link";

// Title row of an admin page: back to the dashboard, plus links to the page
// on the site and to the history.
export function AdminPageHead({
  title,
  intro,
  viewHref,
  historyHref,
  back = { href: "/admin", label: "Dashboard" },
  children,
}: {
  title: string;
  intro?: ReactNode;
  viewHref?: string;
  historyHref?: string;
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="admin-page-head">
      <p>
        <Link href={back.href} className="admin-back">
          <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
            <path
              d="M7.5 2.5 4 6l3.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {back.label}
        </Link>
      </p>
      <h1 className="admin-title">{title}</h1>
      {intro && <p className="admin-intro">{intro}</p>}
      {(viewHref || historyHref || children) && (
        <div className="admin-head-links">
          {viewHref && (
            <Link href={viewHref} className="admin-btn">
              See it on the site
            </Link>
          )}
          {historyHref && (
            <Link href={historyHref} className="admin-btn">
              History
            </Link>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
