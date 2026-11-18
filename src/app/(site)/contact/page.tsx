import type { Metadata } from "next";
import { CopyButton } from "@/components/CopyButton";
import { displayUrl, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="flow">
      <h1 className="page-title">Contact</h1>
      <p className="lede">The best way to reach me is email.</p>
      <ul className="row-list">
        {site.emails.map((email) => (
          <li key={email.address} className="row">
            <span className="row-label">{email.label}</span>
            <span className="row-aside contact-value">
              <a href={`mailto:${email.address}`} className="text-link">
                {email.address}
              </a>
              <CopyButton text={email.address} />
            </span>
          </li>
        ))}
        {site.links.map((link) => (
          <li key={link.href} className="row">
            <span className="row-label">{link.label}</span>
            <span className="row-aside">
              <a href={link.href} className="text-link">
                {displayUrl(link.href)}
              </a>
            </span>
          </li>
        ))}
        <li className="row">
          <span className="row-label">Location</span>
          <span className="row-aside">{site.location}</span>
        </li>
      </ul>
    </div>
  );
}
