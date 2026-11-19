import type { SocialIconName } from "@/components/SocialIcon";
import type {
  About,
  Home,
  PostData,
  Project,
  ProjectsSection,
  Site,
  Socials,
} from "@/lib/content-store/schema";
import type { PostMeta } from "@/lib/posts";
import type { ResumeExperience } from "@/lib/resume";

// What visitors see of each section: hidden items dropped, drafts only with
// includeDrafts. Pure, so fallbacks can render the seeds the same way.

function shown<T extends { hidden?: boolean }>(items: T[]): T[] {
  return items.filter((item) => !item.hidden);
}

export function visibleSite(site: Site): Site {
  return { ...site, emails: shown(site.emails), links: shown(site.links) };
}

export function visibleProjects(
  data: ProjectsSection,
  includeDrafts = false,
): Project[] {
  return shown(data.projects).filter((p) => includeDrafts || !p.draft);
}

export function featuredProjects(home: Home, projects: Project[]): Project[] {
  return home.projects.flatMap((slug) => projects.filter((p) => p.slug === slug));
}

// A link to a project visitors can't open (a draft, hidden or gone) keeps
// its label but loses the link.
export function visibleBalance(
  home: Home,
  projects: Project[],
): Home["balance"] {
  const slugs = new Set(projects.map((p) => p.slug));
  return {
    accounting: home.balance.accounting,
    building: shown(home.balance.building).map((item) => {
      const slug = item.href?.match(/^\/projects\/([^/?#]+)$/)?.[1];
      return slug !== undefined && !slugs.has(slug)
        ? { label: item.label }
        : item;
    }),
  };
}

export function experienceKey(job: ResumeExperience): string {
  return `${job.role}|${job.start}`;
}

export function homeExperience(
  home: Home,
  experience: ResumeExperience[],
): ResumeExperience[] {
  if (home.experience.mode === "all") return experience;
  return home.experience.picks.flatMap((key) =>
    experience.filter((job) => experienceKey(job) === key),
  );
}

export function visibleAbout(about: About): About {
  return {
    competitions: shown(about.competitions),
    clubs: shown(about.clubs),
    hobbies: shown(about.hobbies),
    testimonials: shown(about.testimonials),
  };
}

export type SocialRowView = {
  label: string;
  href: string;
  icon: SocialIconName;
  quick?: boolean;
  copy?: string;
};

export function socialRows(socials: Socials, site: Site): SocialRowView[] {
  return socials.rows.flatMap((row): SocialRowView[] => {
    if ("include" in row) {
      return shown(site.emails).map((email, index) => ({
        label: email.label,
        href: `mailto:${email.address}`,
        icon: "mail",
        copy: email.address,
        quick: index === 0,
      }));
    }
    return row.hidden ? [] : [row];
  });
}

// Newest first.
export function postList(
  posts: Array<{ slug: string; data: PostData }>,
  includeDrafts = false,
): PostMeta[] {
  return posts
    .filter(({ data }) => includeDrafts || !data.draft)
    .map(({ slug, data }) => ({
      slug,
      title: data.title,
      date: data.date,
      summary: data.summary,
      draft: data.draft === true,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
