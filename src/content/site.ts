import type { Site } from "@/lib/content-store/schema";

export type NavItem = {
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  // A page that sums the group up. The footer links to it instead of
  // listing every item; the header menu leaves it out.
  overview?: string;
};

export type NavEntry = NavItem | NavGroup;

export type { Site, SiteEmail, SiteLink } from "@/lib/content-store/schema";

// Fixed in code: root metadata, the header, the /socials initials and the
// T-account total read these at build time.
export const siteIdentity = {
  name: "Matthew Cheng",
  description: "Accounting student who also builds software.",
};

// Seed for the "site" section. The live copy is in the content DB; edit it
// through the API (or MCP). Changes here reach the DB only through
// reset_content_to_seed.
export const siteSeed: Site = {
  tagline: "Accounting student who also builds software.",
  now: "",
  focus: ["Accounting", "CPA path", "Coding projects"],
  about: [
    "I'm a third-year student at SFU's Beedie School of Business, studying accounting and working toward my CPA.",
    "Outside of class I build coding projects, and I like understanding how the code behind them works.",
  ],
  email: "matthewcheng833@gmail.com",
  emails: [
    { label: "Email", address: "matthewcheng833@gmail.com" },
    { label: "School email", address: "wkc10@sfu.ca" },
  ],
  links: [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/matthew-cheng-79b382292/",
    },
    { label: "GitHub", href: "https://github.com/PolarBaeJr" },
  ],
  location: "Burnaby, BC",
  footerLines: [
    "Accounting student, SFU Beedie School of Business",
    "Burnaby, BC",
  ],
};

// Header menu. A plain line is a link; a line with `items` is a dropdown.
// The footer lists every page from here automatically.
// Add a page = add one line (and its route folder).
export const nav: NavEntry[] = [
  {
    label: "About me",
    items: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "Socials", href: "/socials" },
    ],
  },
  { label: "Projects", href: "/projects" },
  {
    label: "Résumé",
    overview: "/resume",
    items: [
      { label: "Accounting", href: "/resume/accounting" },
      { label: "Auditing", href: "/resume/auditing" },
      { label: "Finance", href: "/resume/finance" },
      { label: "Tech", href: "/resume/tech" },
      { label: "General", href: "/resume/general" },
    ],
  },
  { label: "Playground", href: "/playground" },
];

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export const navPages: NavItem[] = nav.flatMap((entry) => {
  if (!isNavGroup(entry)) return [entry];
  return entry.overview
    ? [{ label: entry.label, href: entry.overview }]
    : entry.items;
});

// "https://github.com/PolarBaeJr" -> "github.com/PolarBaeJr"
export function displayUrl(href: string): string {
  return href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}
