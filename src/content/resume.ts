export type Entry = {
  title: string;
  org: string;
  start: string;
  end?: string;
  summary?: string;
};

export type Education = {
  degree: string;
  school: string;
  start: string;
  end?: string;
  gpa?: string;
  coursework?: string[];
};

export type Resume = {
  pdfHref: string;
  summary: string;
  education: Education[];
  experience: Entry[];
  skills: { accounting: string[]; technical: string[] };
  certifications: string[];
  activities: Entry[];
};

// The downloadable PDF goes in public/resume.pdf (served at /resume.pdf).
export const resume: Resume = {
  pdfHref: "/resume.pdf",
  summary: "TODO: short professional summary.",
  education: [],
  experience: [],
  skills: {
    // e.g. "Excel", "QuickBooks", "Financial statements", "Reconciliations"
    accounting: [],
    // e.g. "TypeScript", "React", "Docker"
    technical: [],
  },
  certifications: [],
  activities: [],
};
