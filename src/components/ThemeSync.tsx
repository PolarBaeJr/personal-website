"use client";

import { useLayoutEffect } from "react";
import { applyThemeAttribute, readThemeChoice } from "@/lib/theme";

// No-op in production (the inline script already set it). In development,
// Strict Mode's remount resets <html> attributes; this puts data-theme back.
export function ThemeSync() {
  useLayoutEffect(() => {
    applyThemeAttribute(readThemeChoice());
  }, []);
  return null;
}
