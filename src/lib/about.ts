import {
  clubs,
  competitions,
  hobbies,
  testimonials,
  type Club,
  type Competition,
  type Hobby,
  type Testimonial,
} from "@/content/about";
import { getResume } from "@/lib/resume";

export type Certification = {
  name: string;
  issuer?: string;
  date?: string;
};

export function competitionDates(start?: string, end?: string) {
  if (!start) return null;
  return end ? `${start}–${end}` : start;
}

export function clubDates(start?: string, end?: string) {
  if (!start) return null;
  return `${start}–${end ?? "Present"}`;
}

export function getCompetitions(): Competition[] {
  const fromResume = getResume("general")
    .projects.filter((project) => project.competition)
    .map((project) => ({
      name: project.title,
      role: project.subtitle,
      start: project.start,
      end: project.end,
      href: project.href,
    }));
  return [...fromResume, ...competitions];
}

export function getCertifications(): Certification[] {
  return getResume("general")
    .skills.filter((line) => line.kind === "certifications")
    .map((line) => {
      const text = line.text.trim();
      // "Issuer, Name (Mon YYYY)"; anything else falls back to name-only.
      const match = text.match(/^([^,]+),\s*(.+?)\s*\(([^()]+)\)$/);
      if (!match) return { name: text };
      return { issuer: match[1], name: match[2], date: match[3] };
    });
}

export function getClubs(): Club[] {
  return clubs;
}

export function getHobbies(): Hobby[] {
  return hobbies;
}

export function getTestimonials(): Testimonial[] {
  return testimonials;
}
