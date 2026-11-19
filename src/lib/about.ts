import { cacheLife, cacheTag } from "next/cache";
import type { Club, Competition, Hobby, Testimonial } from "@/content/about";
import { getAbout } from "@/lib/content";
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

// Reads the résumé and the about section, so it is tagged with both.
export async function getCompetitions(): Promise<Competition[]> {
  "use cache";
  cacheLife("max");
  cacheTag("resume", "resume:general", "content", "content:about");
  const { projects } = await getResume("general");
  const { competitions } = await getAbout();
  const fromResume = projects
    .filter((project) => project.competition)
    .map((project) => ({
      name: project.title,
      role: project.subtitle,
      start: project.start,
      end: project.end,
      href: project.href,
    }));
  return [...fromResume, ...competitions];
}

export async function getCertifications(): Promise<Certification[]> {
  const { skills } = await getResume("general");
  return skills
    .filter((line) => line.kind === "certifications")
    .map((line) => {
      const text = line.text.trim();
      // "Issuer, Name (Mon YYYY)"; anything else falls back to name-only.
      const match = text.match(/^([^,]+),\s*(.+?)\s*\(([^()]+)\)$/);
      if (!match) return { name: text };
      return { issuer: match[1], name: match[2], date: match[3] };
    });
}

export async function getClubs(): Promise<Club[]> {
  return (await getAbout()).clubs;
}

export async function getHobbies(): Promise<Hobby[]> {
  return (await getAbout()).hobbies;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return (await getAbout()).testimonials;
}
