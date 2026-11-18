import {
  education,
  experience,
  highlights,
  languages,
  location,
  resumeProjects,
  skills,
  variantConfig,
  type SectionKey,
  type Tagged,
} from "@/content/resume";
import { displayUrl, site } from "@/content/site";
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

function forType<T extends Tagged>(items: T[], type: ResumeType): T[] {
  return items.filter(
    (x) => type === "general" || !x.types || x.types.includes(type),
  );
}

export function getResume(type: ResumeType) {
  const { lineOrder } = variantConfig[type];
  const filteredHighlights = forType(highlights, type);

  return {
    type,
    header: {
      name: site.name,
      location,
      contacts: [
        ...site.emails.map((e) => ({
          label: e.label,
          href: `mailto:${e.address}`,
          text: e.address,
        })),
        ...site.links.map((l) => ({
          label: l.label,
          href: l.href,
          text: displayUrl(l.href),
        })),
      ],
    },
    highlights: filteredHighlights.length > 0 ? filteredHighlights : undefined,
    education: forType(education, type),
    experience: forType(experience, type),
    projects: forType(resumeProjects, type),
    skills: forType(skills, type).sort(
      (a, b) => lineOrder.indexOf(a.kind) - lineOrder.indexOf(b.kind),
    ),
    languages,
  };
}

export type Resume = ReturnType<typeof getResume>;
