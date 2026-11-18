"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav } from "@/content/site";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ pathname }: { pathname?: string }) {
  return (
    <ul className="nav-list">
      {nav.map((item) => {
        const active =
          pathname !== undefined && isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className="nav-link"
              aria-current={active ? "page" : undefined}
              suppressHydrationWarning
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function NavLinks() {
  const pathname = usePathname();
  return <NavList pathname={pathname} />;
}

// Same markup with no active item, shown while the pathname is unknown.
export function NavLinksFallback() {
  return <NavList />;
}
