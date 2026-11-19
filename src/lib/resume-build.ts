import {
  location,
  projectMeta,
  sectionAliases,
  skillLabelKinds,
  variantConfig,
  type ResumeEducation,
  type ResumeExperience,
  type ResumeHighlight,
  type ResumeLine,
  type ResumeProject,
  type SectionKey,
} from "@/content/resume";
import { displayUrl, site } from "@/content/site";
import type { ResumeType } from "@/lib/resume-types";
import {
  looksLikeDateRange,
  splitDates,
  type ParsedEntry,
  type ParsedTex,
} from "@/lib/resume-tex/parse";

function sectionKey(title: string): SectionKey | undefined {
  return sectionAliases.find(([, re]) => re.test(title))?.[0];
}

// "November 2025" -> "Nov 2025", matching how the site writes dates.
function shortMonths(s: string) {
  return s.replace(
    /\b(January|February|March|April|June|July|August|September|October|November|December)\b/g,
    (month) => month.slice(0, 3),
  );
}

function dateRange(s: string) {
  const { start, end } = splitDates(shortMonths(s));
  return { start, end };
}

function stripPeriod(s: string) {
  return s.replace(/\.\s*$/, "");
}

// Jake's \resumeSubheading puts the dates second for experience and fourth for
// education; whichever argument looks like a date range is the dates.
function entryFields(entry: ParsedEntry) {
  const datesFirst = looksLikeDateRange(entry.b);
  return {
    title: entry.a,
    dates: datesFirst ? entry.b : entry.d,
    location: (datesFirst ? entry.d : entry.b) || undefined,
    sub: entry.c,
  };
}

function splitOutsideParens(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((item) => item.trim()).filter(Boolean);
}

function withMeta(project: Omit<ResumeProject, "href" | "competition">) {
  const meta = projectMeta[project.title.toLowerCase().replace(/\s+/g, " ")];
  return { ...project, ...meta };
}

export function buildResume(type: ResumeType, parsed: ParsedTex) {
  const { lineOrder } = variantConfig[type];
  const highlights: ResumeHighlight[] = [];
  const education: ResumeEducation[] = [];
  const experience: ResumeExperience[] = [];
  const projects: ResumeProject[] = [];
  const skills: ResumeLine[] = [];
  const languages: string[] = [];

  function addLanguages(text: string) {
    languages.push(...splitOutsideParens(stripPeriod(text)).map(stripPeriod));
  }

  for (const section of parsed.sections) {
    const key = sectionKey(section.title);
    if (!key) continue;

    if (section.kind === "items") {
      if (key === "highlights") {
        highlights.push(...section.items.map((text) => ({ text })));
      } else if (key === "languages") {
        section.items.forEach(addLanguages);
      }
    } else if (section.kind === "skills") {
      for (const line of section.lines) {
        const kind = skillLabelKinds[line.label.toLowerCase()] ?? "other";
        if (kind === "languages" || key === "languages") {
          addLanguages(line.text);
        } else if (kind === "certifications") {
          for (const item of line.text.split(";")) {
            const text = stripPeriod(item.trim());
            if (text) {
              skills.push({ label: "Certification", text, kind, split: false });
            }
          }
        } else {
          skills.push({ label: line.label, text: stripPeriod(line.text), kind });
        }
      }
    } else if (section.kind === "projects") {
      if (key !== "projects") continue;
      for (const project of section.projects) {
        projects.push(
          withMeta({
            title: project.title,
            subtitle: project.subtitle,
            ...dateRange(project.dates),
            bullets: project.bullets,
          }),
        );
      }
    } else {
      for (const entry of section.entries) {
        const { title, dates, location: place, sub } = entryFields(entry);
        const { start, end } = dateRange(dates);
        if (key === "education") {
          education.push({
            school: title,
            credential: sub,
            location: place,
            start: start ?? "",
            end,
            details: entry.bullets,
          });
        } else if (key === "experience") {
          experience.push({
            role: title,
            org: sub,
            location: place,
            start: start ?? "",
            end,
            bullets: entry.bullets,
          });
        } else if (key === "projects") {
          projects.push(
            withMeta({
              title,
              subtitle: sub || undefined,
              start,
              end,
              bullets: entry.bullets,
            }),
          );
        }
      }
    }
  }

  return {
    type,
    header: {
      name: parsed.name || site.name,
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
    highlights: highlights.length > 0 ? highlights : undefined,
    education,
    experience,
    projects,
    skills: skills.sort(
      (a, b) => lineOrder.indexOf(a.kind) - lineOrder.indexOf(b.kind),
    ),
    languages,
  };
}
