import type { ResumeType } from "@/lib/resume-types";

// Read through src/lib/resume.ts only; pages never import this file directly.
// Résumé content lives in resumes/<type>.tex; this file holds the types and
// the per-variant settings the .tex can't express.

export type Side = "accounting" | "building";

export type SectionKey =
  | "highlights"
  | "education"
  | "experience"
  | "projects"
  | "skills"
  | "languages";

export type ResumeHighlight = { text: string };

export type ResumeExperience = {
  role: string;
  org: string;
  location?: string;
  start: string;
  end?: string;
  bullets: string[];
};

export type ResumeEducation = {
  school: string;
  credential: string;
  location?: string;
  start: string;
  end?: string;
  details: string[];
};

export type ResumeProject = {
  title: string;
  subtitle?: string;
  href?: string;
  start?: string;
  end?: string;
  bullets: string[];
  // true = also list under Case competitions & awards on /about
  competition?: boolean;
};

export type LineKind = "accounting" | "technical" | "certifications" | "other";

export type ResumeLine = {
  label: string;
  text: string;
  kind: LineKind;
  // Comma-separated text becomes one pill per item. Set false to keep one pill.
  split?: boolean;
};

export type VariantConfig = {
  label: string;
  audience: string;
  summary: string;
  side: Side;
  sectionOrder: SectionKey[];
  lineOrder: LineKind[];
};

const accountingSections: SectionKey[] = [
  "highlights",
  "education",
  "experience",
  "projects",
  "skills",
  "languages",
];

const accountingLines: LineKind[] = [
  "accounting",
  "certifications",
  "technical",
  "other",
];

export const variantConfig: Record<ResumeType, VariantConfig> = {
  accounting: {
    label: "Accounting",
    audience: "For accounting and bookkeeping roles.",
    summary: "",
    side: "accounting",
    sectionOrder: accountingSections,
    lineOrder: accountingLines,
  },
  auditing: {
    label: "Auditing",
    audience: "For audit and assurance roles.",
    summary: "",
    side: "accounting",
    sectionOrder: accountingSections,
    lineOrder: ["certifications", "accounting", "technical", "other"],
  },
  finance: {
    label: "Finance",
    audience: "For finance and operations roles.",
    summary: "",
    side: "accounting",
    sectionOrder: accountingSections,
    lineOrder: accountingLines,
  },
  tech: {
    label: "Tech",
    audience: "For technical and data roles.",
    summary: "",
    side: "building",
    sectionOrder: [
      "highlights",
      "projects",
      "experience",
      "skills",
      "education",
      "languages",
    ],
    lineOrder: ["technical", "accounting", "certifications", "other"],
  },
  general: {
    label: "General",
    audience: "Everything in one place.",
    summary: "",
    side: "accounting",
    sectionOrder: [
      "highlights",
      "education",
      "experience",
      "projects",
      "skills",
      "languages",
    ],
    lineOrder: accountingLines,
  },
};

export const location = "Burnaby, BC";

// Section titles in the .tex files map to page sections by these patterns,
// tested case-insensitively in this order. Unmatched sections are dropped.
export const sectionAliases: [SectionKey, RegExp][] = [
  ["education", /education/i],
  ["experience", /experience|employment|leadership|involvement|extracurricular/i],
  ["projects", /project|competition|award/i],
  ["skills", /skill|certification/i],
  ["languages", /^languages$/i],
  ["highlights", /highlight|summary|profile|qualification/i],
];

// Skill line labels (lowercase) to the T-account side they post to. Anything
// unlisted is "other". A "languages" line fills the Languages section instead.
export const skillLabelKinds: Record<string, LineKind | "languages"> = {
  accounting: "accounting",
  "accounting tools": "accounting",
  finance: "accounting",
  technical: "technical",
  programming: "technical",
  "programming languages": "technical",
  tools: "technical",
  software: "technical",
  frameworks: "technical",
  data: "technical",
  certifications: "certifications",
  certification: "certifications",
  languages: "languages",
};

// What a .tex file can't carry, keyed by lowercase project title.
// competition: true also lists the project under Case competitions & awards
// on /about.
export const projectMeta: Record<string, { href?: string; competition?: boolean }> = {
  "sfu badminton club web application": { href: "/projects/badminton-club-app" },
  "sfu badminton club digital payment ledger": {
    href: "/projects/badminton-club-app",
  },
  "sfu badminton club payment ledger": { href: "/projects/badminton-club-app" },
  "cbv institute business valuation challenge": { competition: true },
  "cbv institute business valuation case competition": { competition: true },
};
