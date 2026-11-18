import { site } from "@/content/site";

export type Social = {
  label: string;
  href: string;
  // "primary" is the filled button; "link" is the outlined one.
  kind: "primary" | "link";
  // Left accent stripe: cobalt for the accounting side, teal for building.
  accent?: "cobalt" | "teal";
};

// Shown top to bottom on /socials.
export const socials: Social[] = [
  { label: "Website", href: "/", kind: "primary" },
  { label: "Résumé", href: "/resume", kind: "link", accent: "cobalt" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/matthew-cheng-79b382292/",
    kind: "link",
    accent: "cobalt",
  },
  {
    label: "GitHub",
    href: "https://github.com/PolarBaeJr",
    kind: "link",
    accent: "teal",
  },
  {
    label: "Email",
    href: `mailto:${site.email}`,
    kind: "link",
    accent: "cobalt",
  },
  {
    label: "SFU Badminton Club",
    href: "https://sfubadminton.com",
    kind: "link",
    accent: "teal",
  },
  { label: "Projects", href: "/projects", kind: "link" },
  // To add more, e.g.:
  // { label: "Instagram", href: "https://www.instagram.com/<handle>/", kind: "link" },
  // { label: "Discord", href: "https://discord.gg/<invite>", kind: "link" },
];
