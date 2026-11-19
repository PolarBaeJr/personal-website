// Plain-language names for every stored field, and friendlier versions of
// the validation messages, for the admin pages. Pure, so client forms can
// import it.

export const FIELD_LABELS: Record<string, string> = {
  // site
  tagline: "Tagline",
  now: "Status line on your home page",
  about: "About you",
  focus: "Focus items",
  email: "Main email",
  emails: "Emails",
  links: "Links",
  location: "Location",
  footerLines: "Footer lines",
  avatar: "Photo",
  address: "Email address",
  // home
  projects: "Projects",
  experience: "Experience",
  mode: "Which jobs",
  picks: "Chosen jobs",
  balance: "T-account",
  accounting: "Accounting side",
  building: "Building side",
  // about
  competitions: "Case competitions and awards",
  clubs: "Clubs",
  hobbies: "Hobbies",
  testimonials: "Testimonials",
  name: "Name",
  role: "Role",
  result: "Result or award",
  start: "Start",
  end: "End",
  blurb: "Description",
  image: "Photo",
  src: "Photo file",
  alt: "Photo description",
  quote: "Quote",
  org: "Organisation",
  // projects
  slug: "Web address",
  title: "Title",
  summary: "One-line summary",
  description: "Description",
  category: "Category",
  tags: "Tags",
  kind: "Link type",
  draft: "Draft",
  images: "Photos",
  // socials
  rows: "Rows",
  icon: "Icon",
  quick: "Small icon under your name",
  copy: "Text to copy",
  include: "Your emails",
  // shared
  label: "Label",
  href: "Link",
  hidden: "Hidden from the site",
  // posts
  date: "Date",
  body: "Post text",
};

export const SECTION_LABELS: Record<string, string> = {
  site: "About you and contact details",
  home: "Home page",
  about: "Other involvements page",
  projects: "Projects",
  socials: "Links page",
};

// "post:my-post" -> "Post: my-post"
export function sectionLabel(section: string): string {
  if (section.startsWith("post:")) return `Post: ${section.slice("post:".length)}`;
  return SECTION_LABELS[section] ?? section;
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

// "clubs[2].name" -> "Clubs, item 3, Name"
export function describePath(path: string): string {
  if (!path) return "This page";
  return path
    .split(/\.|(?=\[)/)
    .map((part) => {
      const index = /^\[(\d+)\]$/.exec(part);
      return index ? `item ${Number(index[1]) + 1}` : fieldLabel(part);
    })
    .join(", ");
}

const MESSAGES: [RegExp, string][] = [
  [/^must not be empty$/, "This can't be empty."],
  [/^Required$/, "This is required."],
  [/^Invalid email$/, "This isn't a valid email address."],
  [/^must start with "\/" or "https:\/\/"$/, 'Links start with "https://", or "/" for a page on this site.'],
  [/^must start with "\/"$/, 'This must start with "/".'],
  [/^must be one of emails\[\]\.address$/, "Pick one of your email addresses."],
  [/^duplicate slug$/, "Another project already uses this web address."],
  [/^must be lowercase words joined by hyphens$/, "Use lowercase letters, numbers and hyphens, like my-project."],
  [/^must be a project slug$/, "Pick one of your projects."],
  [/^must be a real date written YYYY-MM-DD$/, "Pick a real date."],
  [/^must not contain an email address$/, "This can't contain an email address."],
  [/^must not contain a phone number$/, "This can't contain a phone number."],
  [/^must not contain a LinkedIn URL$/, "This can't contain a LinkedIn link."],
  [/^must not contain the private phone number or address$/, "This can't contain your private phone number or address."],
  [/^Array must contain at least 1 element/, "Add at least one."],
  [/^String must contain at most/, "This is too long."],
  [/^must be at most \d+ bytes$/, "This post is too long."],
  [/^must be \/hobbies\//, "Photos can't be changed here yet."],
];

export function friendlyMessage(message: string): string {
  for (const [re, text] of MESSAGES) if (re.test(message)) return text;
  const clean = message.trim();
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

// Created/updated times are SQLite UTC "YYYY-MM-DD HH:MM:SS".
export function formatWhen(value: string): string {
  return `${value.slice(0, 16)} UTC`;
}

export function actorLabel(actor: string): string {
  if (actor === "admin") return "You (admin)";
  if (actor === "seed") return "Starting copy";
  if (actor === "api") return "API";
  if (actor === "claude-app") return "Claude (connected app)";
  return actor;
}
