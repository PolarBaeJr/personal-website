import { Suspense } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/(owner)/actions";
import { getOwner } from "@/lib/owner";

// Only the owner gets any of this; visitors get nothing, not even markup.
async function OwnerBarBody() {
  const owner = await getOwner();
  if (!owner) return null;
  return (
    <nav className="owner-bar" aria-label="Owner">
      {/* A plain link, so the browser sends the page as the Referer. */}
      <a href="/admin/edit" className="owner-bar-link owner-bar-link--primary">
        Edit this page
      </a>
      <Link href="/admin" className="owner-bar-link">
        Admin
      </Link>
      <form action={signOutAction}>
        <input type="hidden" name="csrf" value={owner.csrf} />
        <button type="submit" className="owner-bar-link">
          Sign out
        </button>
      </form>
    </nav>
  );
}

export function OwnerBar() {
  return (
    <Suspense fallback={null}>
      <OwnerBarBody />
    </Suspense>
  );
}
