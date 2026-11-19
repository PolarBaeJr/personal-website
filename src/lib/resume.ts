import { cacheLife, cacheTag } from "next/cache";
import { variantConfig, type SectionKey } from "@/content/resume";
import { readSectionSync } from "@/lib/content-data";
import { visibleSite } from "@/lib/content-view";
import { buildResume } from "@/lib/resume-build";
import { readCurrentTex } from "@/lib/resume-data";
import { parseResumeTex } from "@/lib/resume-tex/parse";
import type { ResumeType } from "@/lib/resume-types";

export type {
  LineKind,
  ResumeEducation,
  ResumeExperience,
  ResumeHighlight,
  ResumeLine,
  ResumeProject,
  SectionKey,
  Side,
  VariantConfig,
} from "@/content/resume";

export const SECTION_TITLES: Record<SectionKey, string> = {
  highlights: "Highlights",
  education: "Education",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills & certifications",
  languages: "Languages",
};

export function getVariantMeta(type: ResumeType) {
  return variantConfig[type];
}

// Callers must `await io()` first (inside Suspense) so this only runs at
// request time and never bakes the repo .tex into the static shell.
export async function getResume(type: ResumeType) {
  "use cache";
  cacheLife("max");
  cacheTag("resume", `resume:${type}`, "content:site");
  return buildResume(
    type,
    parseResumeTex(readCurrentTex(type)),
    visibleSite(readSectionSync("site")),
  );
}

export type Resume = Awaited<ReturnType<typeof getResume>>;
