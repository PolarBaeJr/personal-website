import { NextResponse, type NextRequest } from "next/server";
import { postExists, projectExists } from "@/lib/content-data";
import { isResumeType } from "@/lib/resume-types";

// With Cache Components, dynamic routes stream their prerendered shell before
// the page's notFound() runs, which fixes the status at 200. Check the param
// here, before rendering starts, so unknown values get a real 404. Rewriting to
// an unmatched path renders the root not-found page with a 404 status.
// Projects and posts are checked against the content DB (uncached, so a
// change shows at once), falling back to the seeds.
export function proxy(request: NextRequest) {
  const [, section, rawSlug] = request.nextUrl.pathname.split("/");

  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = "";
  }

  let exists: boolean;
  if (section === "projects") {
    exists = projectExists(slug);
  } else if (section === "blog") {
    exists = postExists(slug);
  } else if (section === "resume") {
    exists = isResumeType(slug);
  } else {
    exists = false;
  }

  if (exists) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found", request.url));
}

export const config = {
  matcher: [
    "/projects/:slug",
    "/blog/:slug",
    "/resume/:type",
    "/resume/:type/document",
  ],
};
