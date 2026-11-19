"use client";

import { useRef, useState } from "react";

// Icon-only copy button for the links page. Swaps to a tick for 1.5s after
// copying; the visually hidden status text announces it to screen readers.
export function CopyIconButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      className="links-copy"
      onClick={handleClick}
      aria-label={label}
      data-copied={copied ? "" : undefined}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d={
            copied
              ? "M5 12.5 10 17.5 19 7"
              : "M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
