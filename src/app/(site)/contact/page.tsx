import type { Metadata } from "next";
import { ContactNote } from "@/components/ContactNote";
import { CopyButton } from "@/components/CopyButton";
import { displayUrl, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
};

const reasons = [
  "You're hiring for an accounting, audit or finance role",
  "You need a teammate for a case competition",
  "You want to talk about the CPA path or Beedie",
  "You want to nerd out about a coding project",
];

export default function ContactPage() {
  return (
    <div className="flow">
      <h1 className="page-title">Contact</h1>
      <div className="contact-grid">
        <div className="contact-info">
          <h2 className="contact-subhead">Good reasons to reach out</h2>
          <ul className="check-list">
            {reasons.map((reason) => (
              <li key={reason}>
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path
                    d="M3 8.5 6.5 12 13 4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {reason}
              </li>
            ))}
          </ul>

          <dl className="contact-rows">
            {site.emails.map((email) => (
              <div key={email.address} className="contact-row">
                <dt>{email.label}</dt>
                <dd className="contact-value">
                  <a href={`mailto:${email.address}`} className="text-link">
                    {email.address}
                  </a>
                  <CopyButton text={email.address} />
                </dd>
              </div>
            ))}
            {site.links.map((link) => (
              <div key={link.href} className="contact-row">
                <dt>{link.label}</dt>
                <dd>
                  <a href={link.href} className="text-link">
                    {displayUrl(link.href)}
                  </a>
                </dd>
              </div>
            ))}
            <div className="contact-row">
              <dt>Location</dt>
              <dd>{site.location}</dd>
            </div>
          </dl>
        </div>

        <section aria-labelledby="note-heading">
          <h2 id="note-heading" className="contact-subhead">
            Write me a note
          </h2>
          <ContactNote to={site.email} />
        </section>
      </div>
    </div>
  );
}
