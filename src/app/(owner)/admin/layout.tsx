import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/(owner)/actions";
import { requireOwner } from "@/lib/owner";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
};

// The proxy has already 404'd anyone without a session; this checks again.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const owner = await requireOwner();
  return (
    <>
      <header className="admin-header">
        <div className="admin-header-inner admin-width">
          <Link href="/admin" className="admin-brand">
            Your site
          </Link>
          <nav className="admin-header-nav" aria-label="Admin">
            <Link href="/" className="admin-header-link">
              View site
            </Link>
            <form action={signOutAction}>
              <input type="hidden" name="csrf" value={owner.csrf} />
              <button type="submit" className="admin-header-link">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="admin-main admin-width">{children}</main>
    </>
  );
}
