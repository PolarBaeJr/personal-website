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

export type SiteLink = {
  label: string;
  href: string;
};

export type SiteEmail = {
  label: string;
  address: string;
};

export type BalanceItem = {
  label: string;
  href?: string;
};

export type Site = {
  name: string;
  tagline: string;
  // One sentence about what you're up to right now, shown under the tagline on the home page. Leave as "" to hide.
  now?: string;
  description: string;
  about: string[];
  email: string;
  emails: SiteEmail[];
  links: SiteLink[];
  location: string;
  footerLines: string[];
  // Path to a photo in public/ (e.g. "/avatar.jpg"). Replaces the initials on /socials.
  avatar?: string;
  // The two sides of the home page T-account.
  balance: {
    accounting: string[];
    building: BalanceItem[];
  };
};

export const site: Site = {
  name: "Matthew Cheng",
  tagline: "Accounting student who also builds software.",
  now: "",
  description: "Accounting student who also builds software.",
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
  balance: {
    accounting: [
      "Intermediate Financial Accounting (BUS 320, 321)",
      "Managerial Accounting (BUS 254)",
      "Excel valuation model, CBV Institute challenge",
      "Budget tracking and reconciliation, SFU Badminton Club",
    ],
    building: [
      {
        label: "SFU Badminton Club web app",
        href: "/projects/badminton-club-app",
      },
      { label: "Accounting dashboard", href: "/projects/accounting-dashboard" },
      {
        label: "Proxy manager",
        href: "/projects/proxy-manager",
      },
      { label: "Market tracker", href: "/projects/market-tracker" },
    ],
  },
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
