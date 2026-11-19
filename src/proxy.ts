import { NextResponse, type NextRequest } from "next/server";
import { postExists, projectExists } from "@/lib/content-data";
import { COOKIE_NAME, COOKIE_OPTIONS, sessionForToken } from "@/lib/owner-session";
import { isResumeType } from "@/lib/resume-types";

// With Cache Components, dynamic routes stream their prerendered shell before
// the page's notFound() runs, which fixes the status at 200. Check the param
// here, before rendering starts, so unknown values get a real 404. Rewriting to
// an unmatched path renders the root not-found page with a 404 status.
// Projects and posts are checked against the content DB (uncached, so a
// change shows at once), falling back to the seeds. The owner can also open
// drafts.
// /admin is a 404 to anyone without a live owner session; the pages and
// actions check the session again themselves.
export function proxy(request: NextRequest) {
  const [, section, rawSlug] = request.nextUrl.pathname.split("/");
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isOwner = () => sessionForToken(token) !== null;

  if (section === "admin") {
    if (!token || !isOwner()) {
      return NextResponse.rewrite(new URL("/_not-found", request.url));
    }
    // Keeps the cookie in step with the session's sliding expiry. Only on
    // page loads: a POST may be sign out, which clears it.
    const response = NextResponse.next();
    if (request.method === "GET") response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
    return response;
  }

  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = "";
  }

  // The public check runs first, so visitors (and the owner on published
  // pages) never pay for a session lookup.
  let exists: boolean;
  if (section === "projects") {
    exists = projectExists(slug) || (!!token && projectExists(slug, isOwner()));
  } else if (section === "blog") {
    exists = postExists(slug) || (!!token && postExists(slug, isOwner()));
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
    "/admin",
    "/admin/:path*",
  ],
};
