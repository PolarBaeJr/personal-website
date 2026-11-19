import type { ResumeExperience } from "@/lib/resume";

export function ExperienceRows({
  experience,
}: {
  experience: ResumeExperience[];
}) {
  return (
    <ul className="row-list">
      {experience.map((job) => (
        <li
          key={`${job.role}-${job.org}-${job.start}`}
          className="dated-row dated-row--journal"
        >
          <time className="dated-row-date">
            {job.start}–{job.end ?? "Present"}
          </time>
          <div className="journal-entry">
            <h3 className="journal-debit">{job.role}</h3>
            <p className="journal-credit">{job.org}</p>
            <ul className="bullets">
              {job.bullets.map((bullet) => (
                <li key={bullet} className="dated-row-bullet">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}
