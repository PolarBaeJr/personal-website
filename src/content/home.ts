import type { Home } from "@/lib/content-store/schema";

export type { BalanceItem, Home } from "@/lib/content-store/schema";

// Seed for the "home" section (live copy in the content DB).
export const homeSeed: Home = {
  // Featured projects, in order. Drafts and hidden projects are skipped.
  projects: ["badminton-club-app", "accounting-dashboard", "proxy-manager"],
  // "all" lists every job on the general résumé; "picked" lists only
  // picks, each "Role|Start" as written on the résumé.
  experience: { mode: "all", picks: [] },
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
