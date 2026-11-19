import type { SocialIconName } from "@/components/SocialIcon";
import { site } from "@/content/site";

export type Social = {
  label: string;
  href: string;
  icon: SocialIconName;
  // Also shown as a small icon under the name, like a link-in-bio page.
  quick?: boolean;
  // Shown in small type under the label, with a copy button on the row.
  copy?: string;
};

// One row per address in site.emails (personal first, then school).
const emailRows: Social[] = site.emails.map((email, index) => ({
  label: email.label,
  href: `mailto:${email.address}`,
  icon: "mail",
  copy: email.address,
  quick: index === 0,
}));

// Shown top to bottom on /socials.
export const socials: Social[] = [
  { label: "Website", href: "/", icon: "globe" },
  { label: "Résumé", href: "/resume", icon: "document" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/matthew-cheng-79b382292/",
    icon: "linkedin",
    quick: true,
  },
  {
    label: "GitHub",
    href: "https://github.com/PolarBaeJr",
    icon: "github",
    quick: true,
  },
  ...emailRows,
  {
    label: "SFU Badminton Club",
    href: "https://sfubadminton.com",
    icon: "shuttlecock",
  },
  { label: "Projects", href: "/projects", icon: "folder" },
  // To add more: { label: "Instagram", href: "https://www.instagram.com/<handle>/", icon: "globe" },
];
