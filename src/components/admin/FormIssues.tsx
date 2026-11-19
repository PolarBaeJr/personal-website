"use client";

import { createContext, useContext } from "react";
import type { Issue } from "@/lib/content-store/schema";
import { friendlyMessage } from "@/lib/admin/fields";

// The last save's validation issues, so each field can show its own by path
// (e.g. "clubs[2].name").
const IssuesContext = createContext<Issue[]>([]);

export const IssuesProvider = IssuesContext.Provider;

export function useIssue(path: string | undefined): string | undefined {
  const issues = useContext(IssuesContext);
  if (path === undefined) return undefined;
  const issue = issues.find((i) => i.path === path);
  return issue && friendlyMessage(issue.message);
}
