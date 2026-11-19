import type { Socials } from "@/lib/content-store/schema";

export type { Social } from "@/lib/content-store/schema";

// Seed for the "socials" section (live copy in the content DB). Shown top to
// bottom on /socials. { include: "emails" } becomes one row per address in
// site.emails (personal first, then school); the first is also a quick icon.
export const socialsSeed: Socials = {
  rows: [
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
    { include: "emails" },
    {
      label: "SFU Badminton Club",
      href: "https://sfubadminton.com",
      icon: "shuttlecock",
    },
    { label: "Projects", href: "/projects", icon: "folder" },
    // To add more: { label: "Instagram", href: "https://www.instagram.com/<handle>/", icon: "globe" },
  ],
};
