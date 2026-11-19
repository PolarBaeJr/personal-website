export type Project = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: "accounting" | "tech" | "other";
  tags: string[];
  links: { kind: "live" | "github"; href: string }[];
  featured: boolean;
  draft: boolean;
};

// Drafts are still listed, with a Draft badge. Set draft: false once filled in.
// Link kinds: "live" shows as "Visit site" / "Live", "github" as "View on GitHub" / "GitHub".
export const projects: Project[] = [
  {
    slug: "badminton-club-app",
    title: "SFU Badminton Club web app",
    summary:
      "Member-facing web app for the SFU Badminton Club, with an Elo rating engine and a payment ledger.",
    description:
      "Co-developed the club's web app with a two-person team. Built a custom Elo rating engine for singles and team play, and a payment ledger that matches each e-transfer to its event sign-up (used for 40+ payments).",
    category: "tech",
    tags: ["Web app", "Rating engine", "Payment ledger"],
    links: [
      { kind: "live", href: "https://sfubadminton.com" },
      { kind: "github", href: "https://github.com/PolarBaeJr/rankd" },
    ],
    featured: true,
    draft: false,
  },
  {
    slug: "accounting-dashboard",
    title: "Accounting dashboard",
    summary:
      "Inventory dashboard for a sample logistics company: stock levels, total value and low-stock alerts.",
    description:
      "A browser-based inventory command centre for a fictional company, ABC Logistics. Add items with quantity and unit price, and the dashboard totals inventory value, flags low-stock and out-of-stock items, merges duplicates, and lets you filter the list by category and status. Built with plain HTML, CSS and JavaScript.",
    category: "accounting",
    tags: ["Dashboard", "Inventory", "JavaScript"],
    links: [
      {
        kind: "github",
        href: "https://github.com/PolarBaeJr/Accounting-DashBoard",
      },
    ],
    featured: true,
    draft: true,
  },
  {
    slug: "homelab-proxy-manager",
    title: "Homelab proxy-manager",
    summary:
      "Self-hosted reverse proxy, load balancer and management dashboard, written in Go.",
    description:
      "Self-hosted reverse proxy, load balancer and management dashboard, written in Go. Runs my home server.",
    category: "tech",
    tags: ["Reverse proxy", "Go", "Self-hosted"],
    links: [
      { kind: "github", href: "https://github.com/PolarBaeJr/proxy-manager" },
    ],
    featured: true,
    draft: false,
  },
  {
    slug: "personal-site",
    title: "Personal website",
    summary:
      "This site: portfolio, résumé versions and link page, self-hosted on a Raspberry Pi.",
    description:
      "The site you're on: a portfolio, five tailored résumé versions with PDF downloads, a link page and a journal entry trainer. Built with Next.js, packaged with Docker, and deployed automatically from GitHub to a Raspberry Pi behind my homelab proxy-manager.",
    category: "tech",
    tags: ["Website", "Next.js", "Docker"],
    links: [{ kind: "live", href: "https://matthewcheng.net" }],
    featured: false,
    draft: false,
  },
  {
    slug: "market-tracker",
    title: "Market tracker",
    summary:
      "FX and oil price tracker with a Discord bot, running on a Raspberry Pi.",
    description:
      "Tracks the HKD to CAD exchange rate to help time currency conversions. Each morning it pulls Bank of Canada FX rates, oil prices and news headlines, refreshes a live Wise quote every 15 minutes, and stores the history in SQLite. A Discord bot posts alerts on new highs and lows, and a small web dashboard charts the data. Written in Python and run with Docker on a Raspberry Pi.",
    category: "tech",
    tags: ["Price tracker", "Discord bot", "Raspberry Pi"],
    links: [
      { kind: "github", href: "https://github.com/PolarBaeJr/market-tracker" },
    ],
    featured: false,
    draft: false,
  },
  {
    slug: "student-dashboard",
    title: "Student dashboard",
    summary: "Student management dashboard built with Next.js and Supabase.",
    description:
      "A student planner built around four daily questions: what to work on next, what's due soon, what's overdue, and how much work is left this week. Tracks courses, assignments, tasks, exams and study sessions, with a calendar view and per-user sign-in. Built with Next.js, Supabase and Tailwind CSS.",
    category: "tech",
    tags: ["Dashboard", "Next.js", "Supabase"],
    links: [
      {
        kind: "github",
        href: "https://github.com/PolarBaeJr/student-dashboard",
      },
    ],
    featured: false,
    draft: false,
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getFeaturedProjects(): Project[] {
  return projects.filter((p) => p.featured);
}
