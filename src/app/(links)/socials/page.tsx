import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";
import { socials, type Social } from "@/content/socials";

export const metadata: Metadata = {
  title: { absolute: `${site.name} | Links` },
};

const initials = site.name
  .split(" ")
  .map((word) => word[0])
  .join("");

function className(social: Social) {
  if (social.kind === "primary") return "links-btn links-btn--primary";
  return social.accent ? `links-btn links-btn--${social.accent}` : "links-btn";
}

function SocialLink({ social }: { social: Social }) {
  if (social.href.startsWith("/")) {
    return (
      <Link href={social.href} className={className(social)}>
        {social.label}
      </Link>
    );
  }
  const external = social.href.startsWith("http");
  return (
    <a
      href={social.href}
      className={className(social)}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {social.label}
    </a>
  );
}

export default function SocialsPage() {
  return (
    <div className="links-column">
      <div className="links-profile">
        {site.avatar ? (
          <Image
            src={site.avatar}
            alt={site.name}
            width={72}
            height={72}
            className="links-avatar"
          />
        ) : (
          <div className="links-avatar" aria-hidden="true">
            {initials}
          </div>
        )}
        <h1 className="links-name">{site.name}</h1>
        <p className="links-tagline">{site.tagline}</p>
        <p className="links-location">{site.location}</p>
      </div>

      <ul className="links-list">
        {socials.map((social) => (
          <li key={social.label}>
            <SocialLink social={social} />
          </li>
        ))}
      </ul>

      <p className="links-footer">
        <Link href="/" className="links-footer-link">
          matthewcheng.net
        </Link>
      </p>
    </div>
  );
}
