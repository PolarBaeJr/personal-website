import type { Issue } from "@/lib/content-store/schema";

// What every admin Server Action returns to its form.
export type FormState = {
  ok?: boolean;
  message?: string;
  issues?: Issue[];
  // The section or post version after a save, for the next save's
  // baseVersion.
  version?: number;
};

export const SIGNED_OUT =
  "You're signed out (or this page is too old). Sign in again in another tab, then save again.";

// Thrown before our code runs, e.g. Next refusing the request because the
// Origin and Host headers don't match, or the connection dropping.
export const NOT_REACHED =
  "That didn't reach the site. Check your connection and try again. If it keeps happening, the server's proxy settings may be blocking changes.";
