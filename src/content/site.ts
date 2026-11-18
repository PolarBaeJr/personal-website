export type NavItem = {
  label: string;
  href: string;
};

export type SiteLink = {
  label: string;
  href: string;
};

export type Site = {
  name: string;
  tagline: string;
  description: string;
  about: string[];
  email: string;
  links: SiteLink[];
};

export const site: Site = {
  name: "TODO: Your Name",
  tagline:
    "TODO: One-line intro — e.g. accounting student who also builds software.",
  description: "TODO: meta description",
  about: [
    "TODO: A short paragraph about you — your accounting studies and the things you build.",
  ],
  email: "TODO@example.com",
  links: [
    { label: "Email", href: "mailto:TODO@example.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/TODO" },
    { label: "GitHub", href: "https://github.com/TODO" },
  ],
};

// Add a section = add one line here (and its route folder).
export const nav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Résumé", href: "/resume" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Playground", href: "/playground" },
];
