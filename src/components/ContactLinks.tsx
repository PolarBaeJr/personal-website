import type { SiteEmail, SiteLink } from "@/content/site";

type Props = {
  emails: SiteEmail[];
  links: SiteLink[];
  className?: string;
  linkClassName?: string;
};

export function ContactLinks({ emails, links, className, linkClassName }: Props) {
  return (
    <ul className={className}>
      {emails.map((email) => (
        <li key={email.address}>
          <a href={`mailto:${email.address}`} className={linkClassName}>
            {email.address}
          </a>
        </li>
      ))}
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} className={linkClassName}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
