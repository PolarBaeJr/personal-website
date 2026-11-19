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
    summary: "Accounting dashboard project.",
    description: "TODO: describe the project.",
    category: "accounting",
    tags: ["Dashboard", "Accounting"],
    links: [
      {
        kind: "github",
        href: "https://github.com/PolarBaeJr/Accounting-DashBoard",
      },
    ],
    featured: true,
    draft: false,
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
      "TODO: describe the project. Built with Next.js and deployed with Docker behind my homelab proxy-manager.",
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
    description: "TODO: describe the project.",
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
    description: "TODO: describe the project.",
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
