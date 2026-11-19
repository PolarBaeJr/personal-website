import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Club, Competition, Hobby, Testimonial } from "@/content/about";

// The about lists as plain views, so the admin preview can render unsaved
// edits with the same markup. AboutSections.tsx feeds them live data and an
// owner-only edit link.

export function competitionDates(start?: string, end?: string) {
  if (!start) return null;
  return end ? `${start}–${end}` : start;
}

export function clubDates(start?: string, end?: string) {
  if (!start) return null;
  return `${start}–${end ?? "Present"}`;
}

function RowLink({ href, children }: { href: string; children: string }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className="row-title-link">
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="row-title-link"
    >
      {children}
    </a>
  );
}

export function CompetitionsView({
  competitions,
  edit,
}: {
  competitions: Competition[];
  edit?: ReactNode;
}) {
  if (competitions.length === 0) return null;

  return (
    <section id="competitions" className="flow">
      <h2>Case competitions &amp; awards</h2>
      {edit}
      <ul className="row-list">
        {competitions.map((competition) => {
          const dates = competitionDates(competition.start, competition.end);
          const summary = [competition.role, competition.result]
            .filter(Boolean)
            .join(", ");
          return (
            <li
              key={`${competition.name}-${competition.start ?? ""}`}
              className="row"
            >
              <h3 className="row-label">
                {competition.href ? (
                  <RowLink href={competition.href}>{competition.name}</RowLink>
                ) : (
                  competition.name
                )}
              </h3>
              {dates && (
                <span className="row-aside">
                  <time>{dates}</time>
                </span>
              )}
              {summary && <p className="row-summary">{summary}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ClubsView({
  clubs,
  edit,
}: {
  clubs: Club[];
  edit?: ReactNode;
}) {
  if (clubs.length === 0) return null;

  return (
    <section id="clubs" className="flow">
      <h2>Clubs &amp; involvement</h2>
      {edit}
      <ul className="row-list">
        {clubs.map((club) => {
          const dates = clubDates(club.start, club.end);
          return (
            <li key={`${club.name}-${club.start ?? ""}`} className="row">
              <h3 className="row-label">
                {club.href ? (
                  <RowLink href={club.href}>{club.name}</RowLink>
                ) : (
                  club.name
                )}
              </h3>
              {dates && (
                <span className="row-aside">
                  <time>{dates}</time>
                </span>
              )}
              {club.role && <p className="row-summary">{club.role}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HobbiesView({
  hobbies,
  edit,
}: {
  hobbies: Hobby[];
  edit?: ReactNode;
}) {
  if (hobbies.length === 0) return null;

  return (
    <section id="hobbies" className="flow">
      <h2>Outside of work</h2>
      {edit}
      <ul className="card-grid">
        {hobbies.map((hobby) => (
          <li key={hobby.name} className="hobby-card">
            {hobby.image && (
              <div className="hobby-card-media">
                <Image
                  src={hobby.image.src}
                  alt={hobby.image.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 22rem"
                  className="hobby-card-image"
                />
              </div>
            )}
            <div className="hobby-card-body">
              <h3>{hobby.name}</h3>
              <p className="hobby-card-blurb">{hobby.blurb}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TestimonialsView({
  testimonials,
  edit,
}: {
  testimonials: Testimonial[];
  edit?: ReactNode;
}) {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="flow">
      <h2>Testimonials</h2>
      {edit}
      <ul className="quote-list">
        {testimonials.map((testimonial) => (
          <li key={`${testimonial.name}-${testimonial.quote}`}>
            <figure className="quote">
              <blockquote className="quote-text">
                <p>{testimonial.quote}</p>
              </blockquote>
              <figcaption className="quote-cite">
                {testimonial.name}, {testimonial.role}, {testimonial.org}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
