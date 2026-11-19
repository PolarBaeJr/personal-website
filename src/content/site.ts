export type NavItem = {
  label: string;
  href: string;
};

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
  about: ["TODO: write a short paragraph about yourself."],
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
        label: "Homelab proxy-manager",
        href: "/projects/homelab-proxy-manager",
      },
      { label: "Market tracker", href: "/projects/market-tracker" },
    ],
  },
};

// Add a section = add one line here (and its route folder).
export const nav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Résumé", href: "/resume" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Playground", href: "/playground" },
  { label: "Contact", href: "/contact" },
];

// "https://github.com/PolarBaeJr" -> "github.com/PolarBaeJr"
export function displayUrl(href: string): string {
  return href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}
