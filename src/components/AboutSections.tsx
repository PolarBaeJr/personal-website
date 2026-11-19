import { io } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import {
  clubDates,
  competitionDates,
  getCertifications,
  getClubs,
  getCompetitions,
  getHobbies,
  getTestimonials,
} from "@/lib/about";

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

// Render inside <Suspense>: io() keeps the résumé read out of the static shell.
export async function CompetitionsSection() {
  await io();
  const competitions = await getCompetitions();
  if (competitions.length === 0) return null;

  return (
    <section id="competitions" className="flow">
      <h2>Case competitions &amp; awards</h2>
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

// Render inside <Suspense>, as above.
export async function CertificationsSection() {
  await io();
  const certifications = await getCertifications();
  if (certifications.length === 0) return null;

  return (
    <section id="certifications" className="flow">
      <h2>Certifications</h2>
      <div>
        <ul className="row-list">
          {certifications.map((certification) => (
            <li key={certification.name} className="row">
              <span className="row-label">{certification.name}</span>
              {certification.date && (
                <span className="row-aside">
                  <time>{certification.date}</time>
                </span>
              )}
              {certification.issuer && (
                <p className="row-summary">{certification.issuer}</p>
              )}
            </li>
          ))}
        </ul>
        <p className="ledger-total">
          <span>Total certifications</span>
          <span className="num">{certifications.length}</span>
        </p>
      </div>
    </section>
  );
}

export function ClubsSection() {
  const clubs = getClubs();
  if (clubs.length === 0) return null;

  return (
    <section id="clubs" className="flow">
      <h2>Clubs &amp; involvement</h2>
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

export function HobbiesSection() {
  const hobbies = getHobbies();
  if (hobbies.length === 0) return null;

  return (
    <section id="hobbies" className="flow">
      <h2>Outside of work</h2>
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

export function TestimonialsSection() {
  const testimonials = getTestimonials();
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="flow">
      <h2>Testimonials</h2>
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
