"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isNavGroup, nav, type NavGroup } from "@/content/site";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The menu item that best matches the path: the longest href that matches,
// so a page never highlights two items at once.
function activeHref(pathname: string, items: NavGroup["items"]) {
  let best: string | undefined;
  for (const item of items) {
    if (isActive(pathname, item.href) && item.href.length > (best?.length ?? 0)) {
      best = item.href;
    }
  }
  return best;
}

// Built on <details>/<summary> so the menu opens natively even before (or
// without) hydration, e.g. on a slow phone. JS only adds the extras: opening
// on mouse hover, closing on an outside tap, Escape, focus leaving, or
// picking an item.
function NavDropdown({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname?: string;
}) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const openedByHover = useRef(false);
  const current =
    pathname === undefined ? undefined : activeHref(pathname, group.items);
  const groupActive =
    pathname !== undefined &&
    (current !== undefined ||
      (group.overview !== undefined && isActive(pathname, group.overview)));

  function close() {
    clearTimeout(closeTimer.current);
    openedByHover.current = false;
    if (detailsRef.current) detailsRef.current.open = false;
  }

  // Mouse only: touch and pen keep tap-to-open, since a hover would fire
  // and then the tap would close the menu straight away.
  function onPointerEnter(event: React.PointerEvent) {
    if (event.pointerType !== "mouse") return;
    clearTimeout(closeTimer.current);
    const details = detailsRef.current;
    if (details && !details.open) {
      openedByHover.current = true;
      details.open = true;
    }
  }

  // A short delay lets the pointer cross the gap between trigger and menu.
  function onPointerLeave(event: React.PointerEvent) {
    if (event.pointerType !== "mouse" || !openedByHover.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(close, 200);
  }

  // `open` mirrors the element via onToggle (an event callback); the effect
  // only wires document listeners while the menu is open. Route changes are
  // handled by the parent's key remount.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !detailsRef.current?.contains(event.target)
      ) {
        close();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
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
    <li className="nav-group">
      <details
        ref={detailsRef}
        className="nav-details"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        onBlur={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            close();
          }
        }}
      >
        <summary
          ref={triggerRef}
          className="nav-link nav-trigger"
          data-active={groupActive ? "" : undefined}
          onClick={(event) => {
            // Already open from hovering: a click keeps it open (and pins
            // it) instead of toggling it shut under the pointer.
            if (openedByHover.current) {
              event.preventDefault();
              openedByHover.current = false;
            }
          }}
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
        </summary>
        <ul className="nav-menu">
          {group.items.map((item) => {
            const active = item.href === current;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="nav-menu-link"
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                  suppressHydrationWarning
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </details>
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
