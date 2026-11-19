"use client";

import { useEffect, useRef } from "react";

const LINES =
  ".dated-row-date, .journal-debit, .journal-credit, .dated-row-bullet";
const STEP_MS = 70;

// Reveals each line of the experience list top to bottom: lines already on
// screen play in order (after `initialDelayMs`, so the hero finishes first),
// and lines further down reveal as they scroll into view.
//
// Content is only hidden once this has run (the `reveal-armed` class), so
// without JS, or before hydration, everything is simply visible. The DOM is
// changed directly through the ref: no React state is involved.
export function ScrollReveal({
  initialDelayMs = 0,
  children,
}: {
  initialDelayMs?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lines = Array.from(root.querySelectorAll<HTMLElement>(LINES));
    let first = true;

    const observer = new IntersectionObserver(
      (entries) => {
        const showing = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target as HTMLElement)
          .sort(
            (a, b) =>
              a.getBoundingClientRect().top - b.getBoundingClientRect().top,
          );
        const base = first ? initialDelayMs : 0;
        first = false;
        showing.forEach((line, index) => {
          line.style.transitionDelay = `${base + index * STEP_MS}ms`;
          line.dataset.shown = "";
          observer.unobserve(line);
        });
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    root.classList.add("reveal-armed");
    lines.forEach((line) => observer.observe(line));
    return () => observer.disconnect();
  }, [initialDelayMs]);

  return (
    <div ref={ref} className="scroll-reveal">
      {children}
    </div>
  );
}
