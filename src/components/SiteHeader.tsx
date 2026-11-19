import Link from "next/link";
import { Suspense } from "react";
import { NavLinks, NavLinksFallback } from "@/components/NavLinks";
import { siteIdentity } from "@/content/site";

export function SiteHeader({ showActive = true }: { showActive?: boolean }) {
  return (
    <header className="site-header">
      <div className="site-header-inner site-width">
        <Link href="/" className="site-brand">
          {siteIdentity.name}
        </Link>
        <nav className="site-nav" aria-label="Main">
          {showActive ? (
            <Suspense fallback={<NavLinksFallback />}>
              <NavLinks />
            </Suspense>
          ) : (
            <NavLinksFallback />
          )}
        </nav>
      </div>
    </header>
  );
}
