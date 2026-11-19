"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { isNavGroup, nav, type NavGroup } from "@/content/site";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const groupActive =
    pathname !== undefined &&
    group.items.some((item) => isActive(pathname, item.href));

  // State only changes inside event callbacks, never synchronously in an
  // effect body; route changes are handled by the parent's key remount.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <li
      ref={rootRef}
      className="nav-group"
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="nav-link nav-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        data-active={groupActive ? "" : undefined}
        onClick={() => setOpen((value) => !value)}
        suppressHydrationWarning
      >
        {group.label}
        <svg
          className="nav-chevron"
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 12 12"
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <ul id={menuId} className="nav-menu" hidden={!open}>
        {group.items.map((item) => {
          const active =
            pathname !== undefined && isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="nav-menu-link"
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                suppressHydrationWarning
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function NavList({ pathname }: { pathname?: string }) {
  return (
    <ul className="nav-list">
      {nav.map((entry) => {
        if (isNavGroup(entry)) {
          // Keying on pathname remounts the dropdown on navigation, which
          // resets it to closed without a pathname-watching effect.
          return (
            <NavDropdown
              key={`${entry.label}:${pathname ?? ""}`}
              group={entry}
              pathname={pathname}
            />
          );
        }
        const active =
          pathname !== undefined && isActive(pathname, entry.href);
        return (
          <li key={entry.href}>
            <Link
              href={entry.href}
              className="nav-link"
              aria-current={active ? "page" : undefined}
              suppressHydrationWarning
            >
              {entry.label}
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
