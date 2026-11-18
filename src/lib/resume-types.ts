// Imports nothing, so the proxy can use it without pulling in content.
export const RESUME_TYPES = [
  "accounting",
  "auditing",
  "finance",
  "tech",
  "general",
] as const;

export type ResumeType = (typeof RESUME_TYPES)[number];

export function isResumeType(value: string): value is ResumeType {
  return (RESUME_TYPES as readonly string[]).includes(value);
}
