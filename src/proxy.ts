import { NextResponse, type NextRequest } from "next/server";
import { getProject } from "@/content/projects";
import { getPostSlugs } from "@/lib/posts";

// With Cache Components, /projects/[slug] and /blog/[slug] stream their
// prerendered shell before the page's notFound() runs, which fixes the status
// at 200. Check the slug here, before rendering starts, so unknown slugs get a
// real 404. Rewriting to an unmatched path renders the root not-found page
// (inside the root layout) with a 404 status.
export function proxy(request: NextRequest) {
  const [, section, rawSlug] = request.nextUrl.pathname.split("/");

  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = "";
  }

  const exists =
    section === "projects"
      ? getProject(slug) !== undefined
      : getPostSlugs().includes(slug);

  if (exists) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found", request.url));
}

export const config = {
  matcher: ["/projects/:slug", "/blog/:slug"],
};
