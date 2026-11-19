import type { ProjectsSection } from "@/lib/content-store/schema";

export type { Project } from "@/lib/content-store/schema";

// Seed for the "projects" section (live copy in the content DB). Hidden
// projects are kept here so a reset doesn't lose them.
// Drafts are only shown to the owner. Set draft: false once filled in.
// Featured projects on the home page are listed in home.ts (projects).
// Link kinds: "live" shows as "Visit site" / "Live", "github" as "View on GitHub" / "GitHub".
export const projectsSeed: ProjectsSection = {
  projects: [
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
      draft: false,
      hidden: true,
    },
  ],
};
