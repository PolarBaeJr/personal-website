import type { ResumeExperience } from "@/lib/resume";

export function ExperienceRows({
  experience,
}: {
  experience: ResumeExperience[];
}) {
  return (
    <ul className="row-list">
      {experience.map((job) => (
        <li key={`${job.role}-${job.org}-${job.start}`} className="dated-row">
          <time className="dated-row-date">
            {job.start}–{job.end ?? "Present"}
          </time>
          <div>
            <h3>
              {job.role}, <span className="org">{job.org}</span>
            </h3>
            <ul className="bullets">
              {job.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}
