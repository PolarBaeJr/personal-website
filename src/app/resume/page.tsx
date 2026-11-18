import type { Metadata } from "next";
import { resume, type Entry } from "@/content/resume";

export const metadata: Metadata = {
  title: "Résumé",
};

const EMPTY = "TODO: add entries in src/content/resume.ts";

function dates(start: string, end?: string) {
  return `${start}–${end ?? "present"}`;
}

function Empty() {
  return <p className="text-muted">{EMPTY}</p>;
}

function EntryList({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return <Empty />;
  return (
    <ul className="card-list">
      {entries.map((entry) => (
        <li key={`${entry.title}-${entry.org}-${entry.start}`} className="card flow">
          <h3>
            {entry.title}, {entry.org}
          </h3>
          <p className="text-muted">{dates(entry.start, entry.end)}</p>
          {entry.summary && <p>{entry.summary}</p>}
        </li>
      ))}
    </ul>
  );
}

function SimpleList({ items }: { items: string[] }) {
  if (items.length === 0) return <Empty />;
  return (
    <ul className="link-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function ResumePage() {
  return (
    <div className="stack">
      <header className="flow">
        <h1>Résumé</h1>
        <p>{resume.summary}</p>
        <p>
          {/* TODO: add the file at public/resume.pdf */}
          <a href={resume.pdfHref}>Download résumé (PDF)</a>
        </p>
      </header>

      <section className="flow">
        <h2>Education</h2>
        {resume.education.length === 0 ? (
          <Empty />
        ) : (
          <ul className="card-list">
            {resume.education.map((edu) => (
              <li key={`${edu.degree}-${edu.school}`} className="card flow">
                <h3>
                  {edu.degree}, {edu.school}
                </h3>
                <p className="text-muted">{dates(edu.start, edu.end)}</p>
                {edu.gpa && <p>GPA: {edu.gpa}</p>}
                {edu.coursework && edu.coursework.length > 0 && (
                  <p>Relevant coursework: {edu.coursework.join(", ")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flow">
        <h2>Experience</h2>
        <EntryList entries={resume.experience} />
      </section>

      <section className="flow">
        <h2>Skills</h2>
        <h3>Accounting &amp; finance</h3>
        <SimpleList items={resume.skills.accounting} />
        <h3>Technical</h3>
        <SimpleList items={resume.skills.technical} />
      </section>

      <section className="flow">
        <h2>Certifications</h2>
        <SimpleList items={resume.certifications} />
      </section>

      <section className="flow">
        <h2>Activities &amp; leadership</h2>
        <EntryList entries={resume.activities} />
      </section>
    </div>
  );
}
