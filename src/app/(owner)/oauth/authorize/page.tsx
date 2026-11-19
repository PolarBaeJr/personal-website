import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { decideAuthorization } from "@/app/(owner)/oauth/authorize/actions";
import { checkAuthorizeRequest } from "@/lib/oauth/authorize";
import { getOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: "Connect an app",
};

const FIELDS = [
  "client_id",
  "redirect_uri",
  "response_type",
  "code_challenge",
  "code_challenge_method",
  "state",
  "resource",
  "scope",
];

// The owner's consent for an app (the Claude app) to use /mcp. The proxy
// has already sent signed-out visitors to /login and bad requests back to
// the app; the redirects here are fallbacks.
export default async function AuthorizePage({ searchParams }: PageProps<"/oauth/authorize">) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, v);
    }
  }

  const check = checkAuthorizeRequest(params);
  if (check.kind === "off") {
    return (
      <main className="admin-login">
        <h1 className="admin-title">Connect an app</h1>
        <p className="admin-muted">Sign-in isn&apos;t set up on this server.</p>
      </main>
    );
  }

  const owner = await getOwner();
  if (!owner) redirect("/login?next=" + encodeURIComponent("/oauth/authorize?" + query));

  if (check.kind === "fatal") {
    return (
      <main className="admin-login">
        <h1 className="admin-title">Can&apos;t connect this app</h1>
        <p>{check.message}</p>
        <p>
          <Link href="/" className="text-link">
            Back to the site
          </Link>
        </p>
      </main>
    );
  }
  if (check.kind === "redirect") redirect(check.url);

  return (
    <main className="admin-login">
      <h1 className="admin-title">Allow {check.client.name} to edit your site?</h1>
      <p>
        It will be able to change your pages, blog posts and résumés, the same as
        you can in Admin. Only allow this if you just asked Claude to connect. You
        can disconnect it any time in Admin, Connected apps.
      </p>
      <p className="admin-muted">
        After this you&apos;ll go back to {new URL(check.redirectUri).host}
      </p>
      <form action={decideAuthorization} className="admin-consent">
        <input type="hidden" name="csrf" value={owner.csrf} />
        {FIELDS.map((name) => {
          const value = query.get(name);
          return value === null ? null : (
            <input key={name} type="hidden" name={name} value={value} />
          );
        })}
        <button type="submit" name="decision" value="allow" className="btn btn--primary admin-btn">
          Allow
        </button>
        <button type="submit" name="decision" value="deny" className="admin-btn">
          Deny
        </button>
      </form>
    </main>
  );
}
