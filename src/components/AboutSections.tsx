import { io } from "next/cache";
import {
  ClubsView,
  CompetitionsView,
  HobbiesView,
  TestimonialsView,
} from "@/components/AboutViews";
import { EditLink } from "@/components/EditLink";
import {
  getCertifications,
  getClubs,
  getCompetitions,
  getHobbies,
  getTestimonials,
} from "@/lib/about";

// Render inside <Suspense>: io() keeps the résumé read out of the static shell.
export async function CompetitionsSection() {
  await io();
  return (
    <CompetitionsView
      competitions={await getCompetitions()}
      edit={<EditLink href="/admin/about#edit-competitions" label="Edit competitions" />}
    />
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

// Render inside <Suspense>, as above.
export async function ClubsSection() {
  await io();
  return (
    <ClubsView
      clubs={await getClubs()}
      edit={<EditLink href="/admin/about#edit-clubs" label="Edit clubs" />}
    />
  );
}

// Render inside <Suspense>, as above.
export async function HobbiesSection() {
  await io();
  return (
    <HobbiesView
      hobbies={await getHobbies()}
      edit={<EditLink href="/admin/about#edit-hobbies" label="Edit hobbies" />}
    />
  );
}

// Render inside <Suspense>, as above.
export async function TestimonialsSection() {
  await io();
  return (
    <TestimonialsView
      testimonials={await getTestimonials()}
      edit={<EditLink href="/admin/about#edit-testimonials" label="Edit testimonials" />}
    />
  );
}
