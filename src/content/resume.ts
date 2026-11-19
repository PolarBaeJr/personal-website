import type { ResumeType } from "@/lib/resume-types";

// Read through src/lib/resume.ts only; pages never import this file directly.
// Tag an entry with `types` to show it only on those variants. Untagged entries
// appear on every variant, and "general" shows everything.

export type Side = "accounting" | "building";

export type SectionKey =
  | "highlights"
  | "education"
  | "experience"
  | "projects"
  | "skills"
  | "languages";

export type Tagged = { types?: ResumeType[] };

export type ResumeHighlight = Tagged & { text: string };

export type ResumeExperience = Tagged & {
  role: string;
  org: string;
  location?: string;
  start: string;
  end?: string;
  bullets: string[];
};

export type ResumeEducation = Tagged & {
  school: string;
  credential: string;
  location?: string;
  start: string;
  end?: string;
  details: string[];
};

export type ResumeProject = Tagged & {
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

export type ResumeLine = Tagged & {
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

export const highlights: ResumeHighlight[] = [];

export const education: ResumeEducation[] = [
  {
    school: "Simon Fraser University, Beedie School of Business",
    credential:
      "Bachelor of Business Administration, Accounting Concentration (in progress)",
    location: "Burnaby, BC",
    start: "May 2025",
    end: "May 2028",
    details: [
      "Relevant coursework: Financial Accounting I (BUS 251), Managerial Accounting I (BUS 254), Financial Accounting: Assets (BUS 320), Commercial Law (BUS 393), Business Technology Management (BUS 237), Business Communication (BUS 360W); Financial Accounting: Equities (BUS 321) in progress.",
      "Member: Accounting Student Association.",
    ],
  },
  {
    school: "Fraser International College",
    credential:
      "University Transfer Program, Stage II in Business Administration",
    location: "Burnaby, BC",
    start: "Sep 2023",
    end: "Apr 2025",
    details: [],
  },
];

export const experience: ResumeExperience[] = [
  {
    role: "Internal Events Director",
    org: "SFU Badminton Club",
    location: "Burnaby, BC",
    start: "May 2026",
    bullets: [
      "Forecast and manage the internal events budget, tracking spend against plan and reconciling costs and reimbursements.",
      "Plan and host club events across a 15-person team, including facility bookings, equipment, and scheduling.",
      "Record meeting minutes and own registration and attendance records for club events.",
      "Stepped in to run two 60-player club competitions when the host was unavailable, allocating 8+ courts and managing player flow to reduce crowding and keep matches on schedule.",
    ],
  },
  {
    role: "Customer Service Representative",
    org: "Whole Foods Market",
    location: "Burnaby, BC",
    start: "Nov 2025",
    end: "Mar 2026",
    bullets: [
      "Processed 150+ POS transactions per eight-hour shift across payments, returns, and exchanges, maintaining accuracy under continuous customer volume.",
      "Supported daily till reconciliation at shift close, checking transaction records against cash on hand and flagging discrepancies before handover.",
      "Documented escalations and exceptions so the next shift had a complete, reviewable record.",
    ],
  },
  {
    role: "Peer Educator",
    org: "Fraser International College",
    location: "Burnaby, BC",
    start: "Sep 2024",
    end: "May 2025",
    bullets: [
      "Supported 50+ students per semester through drop-in and booked advising sessions.",
    ],
  },
];

export const resumeProjects: ResumeProject[] = [
  {
    title: "SFU Badminton Club Web Application",
    href: "/projects/badminton-club-app",
    start: "May 2026",
    bullets: [
      "Co-developed the club's web app with a two-person team and built a custom Elo rating engine.",
      "Built and deployed an e-transfer verification flow matching payments to sign-ups, used for 20+ payments.",
    ],
  },
  {
    title: "CBV Institute Business Valuation Challenge",
    subtitle: "Team Member",
    start: "Nov 2026",
    competition: true,
    bullets: [
      "Built the team's Excel valuation model, normalizing 3 years of EBITDA (removing excess owner pay and personal costs) and setting maintainable EBITDA of $21.7M with a through-the-cycle weighting.",
      "Selected a 5.0x–6.0x EV/EBITDA multiple, below the precedent median for declining margins and customer concentration, valuing the 85% stake at about $65M.",
      "Flagged that our weighting double-counted a recovery, leading to a $61.3M offer with a vendor take-back and earn-out instead of paying for recovery upfront.",
    ],
  },
];

// Accounting and technical skill lines go here too, e.g.
// { label: "Accounting", kind: "accounting", text: "Excel, Reconciliations" }
// Certification lines are written as `Issuer, Certificate name (Mon YYYY)`;
// /about splits them into issuer/name/date. Give each line a unique label or
// keep split: false.
export const skills: ResumeLine[] = [
  {
    label: "Certification",
    kind: "certifications",
    text: "Microsoft, Preparing Data for Analysis with Microsoft Excel (Nov 2025)",
    split: false,
  },
];

export const languages: string[] = [
  "Cantonese (native / bilingual)",
  "English (native / bilingual)",
  "Mandarin (conversational)",
];
