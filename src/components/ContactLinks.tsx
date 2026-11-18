import { site } from "@/content/site";

type Props = {
  className?: string;
  linkClassName?: string;
};

export function ContactLinks({ className, linkClassName }: Props) {
  return (
    <ul className={className}>
      {site.emails.map((email) => (
        <li key={email.address}>
          <a href={`mailto:${email.address}`} className={linkClassName}>
            {email.address}
          </a>
        </li>
      ))}
      {site.links.map((link) => (
        <li key={link.href}>
          <a href={link.href} className={linkClassName}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
