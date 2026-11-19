import { Suspense } from "react";
import Link from "next/link";
import { getOwner } from "@/lib/owner";

// A small "Edit ..." link next to a heading, for the owner only. Visitors
// get nothing at all.
async function EditLinkBody({ href, label }: { href: string; label: string }) {
  if (!(await getOwner())) return null;
  return (
    <p className="owner-edit">
      <Link href={href} className="owner-edit-link">
        {label}
      </Link>
    </p>
  );
}

export function EditLink(props: { href: string; label: string }) {
  return (
    <Suspense fallback={null}>
      <EditLinkBody {...props} />
    </Suspense>
  );
}
