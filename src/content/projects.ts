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
      "Web app for the SFU Badminton Club, with player rankings and a payment ledger.",
    description:
      "Co-developed the club's web app with a two-person team. Built a custom Elo rating system (the ranking method used in chess) for singles and team play, and a payment ledger that matches each e-transfer to its event sign-up (used for 40+ payments).",
    category: "tech",
    tags: ["Web app", "Player rankings", "Payment ledger"],
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
      "A browser-based inventory command centre for a fictional company, ABC Logistics. Add items with quantity and unit price, and the dashboard totals inventory value, flags low-stock and out-of-stock items, merges duplicates, and lets you filter the list by category and status. It runs right in the browser.",
    category: "accounting",
    tags: ["Dashboard", "Inventory", "Stock alerts"],
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
      "Directs website visitors to the right app, with a dashboard to manage it all.",
    description:
      "A tool that sends each website visitor to the right app and spreads busy traffic so nothing gets overloaded, with a dashboard to see and manage everything in one place. Adding a new site takes a couple of settings instead of manual setup. Written in Go.",
    category: "tech",
    tags: ["Web traffic", "Dashboard", "Go"],
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
      "A portfolio with five tailored résumé versions and PDF downloads, a link page and a journal entry trainer. Updates go live automatically.",
    category: "tech",
    tags: ["Website", "Résumés", "Practice tool"],
    links: [{ kind: "live", href: "https://matthewcheng.net" }],
    featured: false,
    draft: false,
  },
  {
    slug: "market-tracker",
    title: "Market tracker",
    summary:
      "Tracks exchange rates and oil prices, and posts alerts to Discord.",
    description:
      "Tracks exchange rates and oil prices. Each morning it collects Bank of Canada exchange rates, oil prices and news headlines, keeps the rate up to date through the day, and saves the history. A Discord bot posts alerts when prices hit new highs or lows, and a simple dashboard charts the trends. Written in Python.",
    category: "tech",
    tags: ["Exchange rates", "Price alerts", "Python"],
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
