import { Suspense } from "react";
import type { Metadata } from "next";
import { io } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { siteIdentity, type Site } from "@/content/site";
import { CopyIconButton } from "@/components/CopyIconButton";
import { EditLink } from "@/components/EditLink";
import { Skeleton } from "@/components/Skeleton";
import { SocialIcon } from "@/components/SocialIcon";
import { getSite, getSocials } from "@/lib/content";
import type { SocialRowView } from "@/lib/content-view";

export const metadata: Metadata = {
  title: { absolute: `${siteIdentity.name} | Links` },
};

const initials = siteIdentity.name
  .split(" ")
  .map((word) => word[0])
  .join("");

// Internal pages use <Link>; everything else is a plain anchor, opened in
// a new tab when it leaves the site.
function SocialAnchor({
  social,
  className,
  children,
  label,
}: {
  social: SocialRowView;
  className: string;
  children: React.ReactNode;
  label?: string;
}) {
  if (social.href.startsWith("/")) {
    return (
      <Link href={social.href} className={className} aria-label={label}>
        {children}
      </Link>
    );
  }
  const external = social.href.startsWith("http");
  return (
    <a
      href={social.href}
      className={className}
      aria-label={label}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

function LinksBody({
  site,
  socials,
}: {
  site: Site;
  socials: SocialRowView[];
}) {
  return (
    <>
      <div className="links-profile">
        {site.avatar ? (
          <Image
            src={site.avatar}
            alt={siteIdentity.name}
            width={112}
            height={112}
            className="links-avatar"
          />
        ) : (
          <div className="links-avatar" aria-hidden="true">
            {initials}
          </div>
        )}
        <h1 className="links-name">{siteIdentity.name}</h1>
        <p className="links-tagline">{site.tagline}</p>
        <p className="links-location">{site.location}</p>
        <ul className="links-quick">
          {socials
            .filter((social) => social.quick)
            .map((social) => (
              <li key={social.label}>
                <SocialAnchor
                  social={social}
                  className="links-quick-link"
                  label={social.label}
                >
                  <SocialIcon name={social.icon} className="links-quick-icon" />
                </SocialAnchor>
              </li>
            ))}
        </ul>
      </div>

      <ul className="links-list">
        {socials.map((social) => (
          <li key={social.label} className="links-item">
            <SocialAnchor social={social} className="links-btn">
              <SocialIcon name={social.icon} className="links-btn-icon" />
              <span className="links-btn-text">
                <span className="links-btn-label">{social.label}</span>
                {social.copy && (
                  <span className="links-btn-sub">{social.copy}</span>
                )}
              </span>
            </SocialAnchor>
            {social.copy && (
              <CopyIconButton
                text={social.copy}
                label={`Copy ${social.copy}`}
              />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

async function LiveLinksBody() {
  await io();
  const [site, socials] = await Promise.all([getSite(), getSocials()]);
  return <LinksBody site={site} socials={socials} />;
}

export default function SocialsPage() {
  return (
    <div className="links-column">
      <Suspense fallback={<Skeleton lines={9} minHeight="32rem" />}>
        <LiveLinksBody />
      </Suspense>

      <EditLink href="/admin/socials" label="Edit links page" />
      <p className="links-footer">
        <Link href="/" className="links-footer-link">
          matthewcheng.net
        </Link>
      </p>
    </div>
  );
}
