export type Project = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: "accounting" | "tech" | "other";
  tags: string[];
  links: { label: string; href: string }[];
  featured: boolean;
  draft: boolean;
};

// Drafts are still listed, with a Draft badge. Set draft: false once filled in.
export const projects: Project[] = [
  {
    slug: "badminton-club-app",
    title: "Badminton club app",
    summary: "TODO: one-line summary.",
    description: "TODO: describe the project, your role, and the stack.",
    category: "tech",
    tags: [],
    links: [],
    featured: true,
    draft: true,
  },
  {
    slug: "chaos-cards",
    title: "Chaos Cards",
    summary: "TODO: one-line summary.",
    description: "TODO: describe the project, your role, and the stack.",
    category: "tech",
    tags: [],
    links: [],
    featured: true,
    draft: true,
  },
  {
    slug: "homelab-proxy-manager",
    title: "Homelab proxy-manager",
    summary: "TODO: one-line summary.",
    description: "TODO: describe the project, your role, and the stack.",
    category: "tech",
    tags: [],
    links: [],
    featured: true,
    draft: true,
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getFeaturedProjects(): Project[] {
  return projects.filter((p) => p.featured);
}
