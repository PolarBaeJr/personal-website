import Link from "next/link";
import { ExperienceRows } from "@/components/ExperienceRows";
import {
  getResume,
  getVariantMeta,
  SECTION_TITLES,
  type LineKind,
  type Resume,
  type SectionKey,
} from "@/lib/resume";
import type { ResumeType } from "@/lib/resume-types";

const swatchTone: Record<LineKind, string> = {
  accounting: "cobalt",
  technical: "teal",
  certifications: "ink",
  other: "ink",
};

function dates(start?: string, end?: string) {
  if (!start) return null;
  return end ? `${start}–${end}` : start;
}

function SectionBody({ section, resume }: { section: SectionKey; resume: Resume }) {
  switch (section) {
    case "highlights":
      return (
        <ul className="bullets">
          {resume.highlights?.map((h) => (
            <li key={h.text}>{h.text}</li>
          ))}
        </ul>
      );
    case "education":
      return (
        <ul className="row-list">
          {resume.education.map((edu) => (
            <li key={`${edu.school}-${edu.start}`} className="dated-row">
              <time className="dated-row-date">{dates(edu.start, edu.end)}</time>
              <div>
                <h3>
                  {edu.credential}, <span className="org">{edu.school}</span>
                </h3>
                {edu.details.length > 0 && (
                  <ul className="bullets">
                    {edu.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      );
    case "experience":
      return <ExperienceRows experience={resume.experience} />;
    case "projects":
      return (
        <ul className="row-list">
          {resume.projects.map((project) => (
            <li key={project.title} className="dated-row">
              <time className="dated-row-date">
                {dates(project.start, project.end)}
              </time>
              <div>
                <h3>
                  {project.href ? (
                    <Link href={project.href} className="row-title-link">
                      {project.title}
                    </Link>
                  ) : (
                    project.title
                  )}
                  {project.subtitle && (
                    <>
                      , <span className="org">{project.subtitle}</span>
                    </>
                  )}
                </h3>
                <ul className="bullets">
                  {project.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      );
    case "skills":
      return (
        <ul className="skill-lines">
          {resume.skills.map((line) => {
            const items =
              line.split === false
                ? [line.text]
                : line.text.split(",").map((item) => item.trim());
            return (
              <li key={line.label} className="skill-line">
                <span
                  className={`swatch swatch--${swatchTone[line.kind]}`}
                  aria-hidden="true"
                />
                <span className="skill-label">{line.label}</span>
                {items.map((item) => (
                  <span key={item} className="pill pill--slate pill--wrap">
                    {item}
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
      );
    case "languages":
      return (
        <ul className="pill-list">
          {resume.languages.map((language) => (
            <li key={language} className="pill pill--slate">
              {language}
            </li>
          ))}
        </ul>
      );
  }
}

export function ResumeSections({ type }: { type: ResumeType }) {
  const resume = getResume(type);
  const sections = getVariantMeta(type).sectionOrder.filter((section) => {
    if (section === "highlights") return resume.highlights !== undefined;
    return resume[section].length > 0;
  });

  return (
    <div className="resume-sections">
      {sections.map((section) => (
        <section key={section} className="flow">
          <h2 className="swatch-heading">
            <span className="swatch swatch--ink" aria-hidden="true" />
            {SECTION_TITLES[section]}
          </h2>
          <SectionBody section={section} resume={resume} />
        </section>
      ))}
    </div>
  );
}
