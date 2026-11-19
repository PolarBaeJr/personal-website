export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "theme";

// Cycle order for the toggle.
export const THEME_CHOICES: ThemeChoice[] = ["system", "light", "dark"];

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "system";
}

export function applyThemeAttribute(choice: ThemeChoice) {
  if (choice === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", choice);
  }
}

const listeners = new Set<() => void>();

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {}
  applyThemeAttribute(choice);
  listeners.forEach((listener) => listener());
}

export function subscribeTheme(callback: () => void) {
  listeners.add(callback);
  // Another tab changed the theme.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    applyThemeAttribute(readThemeChoice());
    callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export const getThemeSnapshot = readThemeChoice;

// Unknown on the server; the toggle renders a neutral icon until hydration.
export const getThemeServerSnapshot = () => null;

// Runs in <head> before first paint so a saved choice never flashes.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
