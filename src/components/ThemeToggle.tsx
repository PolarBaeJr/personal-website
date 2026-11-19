"use client";

import { useSyncExternalStore } from "react";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  readThemeChoice,
  setThemeChoice,
  subscribeTheme,
  THEME_CHOICES,
  type ThemeChoice,
} from "@/lib/theme";

const LABELS: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

function ThemeIcon({ choice }: { choice: ThemeChoice | null }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {choice === null ? <circle cx="12" cy="12" r="8" /> : null}
      {choice === "system" ? (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </>
      ) : null}
      {choice === "light" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      ) : null}
      {choice === "dark" ? <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /> : null}
    </svg>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const label = choice === null ? "Theme" : `Theme: ${LABELS[choice]}`;

  function cycle() {
    const current = THEME_CHOICES.indexOf(readThemeChoice());
    setThemeChoice(THEME_CHOICES[(current + 1) % THEME_CHOICES.length]);
  }

  return (
    <button
      type="button"
      className={className ? `theme-toggle ${className}` : "theme-toggle"}
      aria-label={label}
      title={label}
      onClick={cycle}
    >
      <ThemeIcon choice={choice} />
    </button>
  );
}
