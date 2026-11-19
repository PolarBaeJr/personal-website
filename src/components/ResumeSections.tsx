import Link from "next/link";
import { ExperienceRows } from "@/components/ExperienceRows";
import {
  getResume,
  getVariantMeta,
  SECTION_TITLES,
  type Resume,
  type SectionKey,
  type Side,
} from "@/lib/resume";
import type { ResumeType } from "@/lib/resume-types";

type SkillLine = Resume["skills"][number];

function skillItems(line: SkillLine) {
  return line.split === false
    ? [line.text]
    : line.text.split(",").map((item) => item.trim());
}

// Accounting and certifications always debit the left column and technical
// skills always credit the right; "other" falls on whichever side the variant
// leans toward.
function skillSide(kind: SkillLine["kind"], variantSide: Side): Side {
  if (kind === "accounting" || kind === "certifications") return "accounting";
  if (kind === "technical") return "building";
  return variantSide;
}

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
    case "skills": {
      const { side } = getVariantMeta(resume.type);
      const accounting = resume.skills.filter(
        (line) => skillSide(line.kind, side) === "accounting",
      );
      const building = resume.skills.filter(
        (line) => skillSide(line.kind, side) === "building",
      );
      const total = resume.skills.reduce(
        (sum, line) => sum + skillItems(line).length,
        0,
      );
      return (
        <div className="taccount taccount--compact">
          <h3 className="taccount-label taccount-label--accounting">
            Accounting
          </h3>
          <h3 className="taccount-label taccount-label--building">Building</h3>
          <div className="taccount-hr taccount-static" aria-hidden="true" />
          <ul className="taccount-col taccount-col--accounting">
            {accounting.length > 0 ? (
              accounting.map((line) => (
                <li key={line.label} className="taccount-skill">
                  <span className="skill-label">{line.label}</span>
                  <span className="pill-list">
                    {skillItems(line).map((item) => (
                      <span key={item} className="pill pill--cobalt pill--wrap">
                        {item}
                      </span>
                    ))}
                  </span>
                </li>
              ))
            ) : (
              <li className="taccount-empty">No entries yet</li>
            )}
          </ul>
          <ul className="taccount-col taccount-col--building">
            {building.length > 0 ? (
              building.map((line) => (
                <li key={line.label} className="taccount-skill">
                  <span className="skill-label">{line.label}</span>
                  <span className="pill-list">
                    {skillItems(line).map((item) => (
                      <span key={item} className="pill pill--teal pill--wrap">
                        {item}
                      </span>
                    ))}
                  </span>
                </li>
              ))
            ) : (
              <li className="taccount-empty">No entries yet</li>
            )}
          </ul>
          <div className="taccount-vr taccount-static" aria-hidden="true" />
          <p className="taccount-total">
            <span className="taccount-total-label">Total entries</span>
            <span className="taccount-total-value">{total}</span>
          </p>
        </div>
      );
    }
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
