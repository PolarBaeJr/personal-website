import Link from "next/link";
import { Suspense } from "react";
import { NavLinks, NavLinksFallback } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { siteIdentity } from "@/content/site";

export function SiteHeader({ showActive = true }: { showActive?: boolean }) {
  return (
    <header className="site-header">
      <div className="site-header-inner site-width">
        <Link href="/" className="site-brand">
          {siteIdentity.name}
        </Link>
        <div className="site-header-end">
          <nav className="site-nav" aria-label="Main">
            {showActive ? (
              <Suspense fallback={<NavLinksFallback />}>
                <NavLinks />
              </Suspense>
            ) : (
              <NavLinksFallback />
            )}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
