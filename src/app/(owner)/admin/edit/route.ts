import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/owner";

// "Edit this page" in the owner bar links here, and the Referer says which
// page that was. Mapping it on the server keeps admin paths out of the
// public JavaScript.
function editorFor(pathname: string): string {
  const [, section, slug] = pathname.split("/");
  const safeSlug = slug && /^[a-z0-9-]+$/.test(slug) ? slug : "";
  switch (section) {
    case "":
      return "/admin/home";
    case "about":
      return "/admin/about";
    case "contact":
      return "/admin/site#edit-emails";
    case "socials":
      return "/admin/socials";
    case "projects":
      return safeSlug ? `/admin/projects?open=${safeSlug}` : "/admin/projects";
    case "blog":
      return safeSlug ? `/admin/posts/${safeSlug}` : "/admin/posts";
    case "resume":
      return safeSlug ? `/admin/resume/${safeSlug}` : "/admin/resume";
    default:
      return "/admin";
  }
}

export async function GET(req: NextRequest) {
  await requireOwner();
  let target = "/admin";
  const referer = req.headers.get("referer");
  if (referer) {
    // Only the path is used, and only to pick one of the fixed targets above.
    try {
      target = editorFor(new URL(referer).pathname);
    } catch {}
  }
  return NextResponse.redirect(new URL(target, req.url), 303);
}
