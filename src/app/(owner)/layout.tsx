import type { Metadata } from "next";

// Sign-in and admin pages: never indexed, never linked from the public site.
// They read the session cookie at the top of the page and wait for it,
// which is fine for one person, so they opt out of the instant-navigation
// check.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OwnerLayout({ children }: LayoutProps<"/">) {
  return <div className="admin">{children}</div>;
}
