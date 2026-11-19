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
  // Hidden projects are left out everywhere (lists, footer, their own page).
  hidden?: boolean;
};

// Drafts are still listed, with a Draft badge. Set draft: false once filled in.
// Link kinds: "live" shows as "Visit site" / "Live", "github" as "View on GitHub" / "GitHub".
const allProjects: Project[] = [
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
    slug: "proxy-manager",
    title: "Proxy manager",
    summary:
      "Reverse proxy, load balancer and management dashboard, written in Go.",
    description:
      "A reverse proxy and load balancer with a management dashboard, written in Go. It routes web traffic to services and is configured through container labels instead of hand-written config files.",
    category: "tech",
    tags: ["Reverse proxy", "Load balancer", "Go"],
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
      "Portfolio with tailored résumé versions, a link page and a journal entry trainer.",
    description:
      "A portfolio with five tailored résumé versions and PDF downloads, a link page and a journal entry trainer. Built with Next.js and deployed automatically from GitHub.",
    category: "tech",
    tags: ["Website", "Next.js", "CI/CD"],
    links: [{ kind: "live", href: "https://matthewcheng.net" }],
    featured: false,
    draft: false,
  },
  {
    slug: "market-tracker",
    title: "Market tracker",
    summary:
      "FX and oil price tracker with a Discord bot.",
    description:
      "Tracks exchange rates and oil prices. Each morning it pulls Bank of Canada FX rates, oil prices and news headlines, refreshes a live conversion quote through the day, and stores the history in SQLite. A Discord bot posts alerts on new highs and lows, and a small web dashboard charts the data. Written in Python.",
    category: "tech",
    tags: ["Price tracker", "Discord bot", "Python"],
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
    hidden: true,
  },
];

export const projects = allProjects.filter((project) => !project.hidden);

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getFeaturedProjects(): Project[] {
  return projects.filter((p) => p.featured);
}
