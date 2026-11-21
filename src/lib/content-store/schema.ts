import { z } from "zod";
import { containsPrivateDetails } from "@/lib/resume-api";

// Validation for every DB-backed content section and for posts. Objects are
// strict, so a typo in a key is an error rather than silently dropped.

export const SECTIONS = ["site", "home", "about", "projects", "socials"] as const;
export type SectionName = (typeof SECTIONS)[number];

export function isSectionName(value: string): value is SectionName {
  return (SECTIONS as readonly string[]).includes(value);
}

export const SOCIAL_ICON_NAMES = [
  "globe",
  "document",
  "linkedin",
  "github",
  "mail",
  "shuttlecock",
  "folder",
] as const;

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_POST_BODY_BYTES = 200 * 1024;

const text = z.string().trim().min(1, "must not be empty");
const optionalText = z.string().optional();
const hidden = z.boolean().optional();

// "/..." stays on site; anything else must be https.
const href = z
  .string()
  .regex(/^(\/(?!\/)\S*|https:\/\/\S+)$/, 'must start with "/" or "https://"');

const image = z
  .object({
    src: z
      .string()
      .regex(
        /^(\/hobbies\/[^?]+|\/media\/[a-f0-9]{64}\.(webp|jpg))$/,
        "must be /hobbies/<file> or /media/<sha256>.webp|jpg",
      ),
    alt: text,
    width: z.number().int().min(1).max(10000).optional(),
    height: z.number().int().min(1).max(10000).optional(),
  })
  .strict()
  .refine((i) => (i.width === undefined) === (i.height === undefined), {
    message: "width and height go together",
    path: ["width"],
  });

const email = z
  .object({
    label: text,
    address: z.string().email(),
    hidden,
  })
  .strict();

const siteLink = z.object({ label: text, href, hidden }).strict();

export const siteSchema = z
  .object({
    tagline: text,
    // One sentence about what you're up to right now, shown under the tagline on the home page. Leave as "" to hide.
    now: z.string().optional(),
    about: z.array(text),
    // Short facts shown after the location under the home intro.
    focus: z.array(text),
    email: z.string().email(),
    emails: z.array(email).min(1),
    links: z.array(siteLink),
    location: text,
    footerLines: z.array(text),
    // A photo uploaded in Admin ("/media/<sha256>.webp"), or a file in public/ like "/avatar.jpg". Replaces the initials on /socials.
    avatar: z.string().regex(/^\/(?!\/)\S+$/, 'must start with "/"').optional(),
  })
  .strict()
  .superRefine((site, ctx) => {
    if (!site.emails.some((e) => e.address === site.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "must be one of emails[].address",
      });
    }
  });

const balanceItem = z.object({ label: text, href: href.optional(), hidden }).strict();

export const homeSchema = z
  .object({
    // Featured projects on the home page, in this order.
    projects: z.array(z.string().regex(SLUG_RE, "must be a project slug")),
    experience: z
      .object({
        mode: z.enum(["all", "picked"]),
        // "Role|Start" keys from the general résumé, e.g. "Internal Events Director|May 2026".
        picks: z.array(text),
      })
      .strict(),
    // The two sides of the home page T-account.
    balance: z
      .object({
        accounting: z.array(text),
        building: z.array(balanceItem),
      })
      .strict(),
  })
  .strict();

const competition = z
  .object({
    name: text,
    role: optionalText,
    // Placement or award, only if there was one.
    result: optionalText,
    start: optionalText,
    end: optionalText,
    href: href.optional(),
    hidden,
  })
  .strict();

const club = z
  .object({
    name: text,
    role: optionalText,
    start: optionalText,
    end: optionalText,
    href: href.optional(),
    hidden,
  })
  .strict();

const hobby = z
  .object({ name: text, blurb: text, image: image.optional(), hidden })
  .strict();

const CONTACT_PATTERNS: [RegExp, string][] = [
  [/[^\s@]+@[^\s@]+\.[^\s@]+/, "must not contain an email address"],
  [/(?:\d[\s().+-]*){7,}/, "must not contain a phone number"],
  [/linkedin\.com/i, "must not contain a LinkedIn URL"],
];

// NEVER add email/phone/LinkedIn or any contact info for the person quoted.
// Only name, role, org appear.
const noContact = text.superRefine((value, ctx) => {
  for (const [re, message] of CONTACT_PATTERNS) {
    if (re.test(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }
});

const testimonial = z
  .object({
    quote: noContact,
    name: noContact,
    role: noContact,
    org: noContact,
    hidden,
  })
  .strict();

export const aboutSchema = z
  .object({
    competitions: z.array(competition),
    clubs: z.array(club),
    hobbies: z.array(hobby),
    testimonials: z.array(testimonial),
  })
  .strict();

const project = z
  .object({
    slug: z.string().regex(SLUG_RE, "must be lowercase words joined by hyphens"),
    title: text,
    summary: text,
    description: text,
    category: z.enum(["accounting", "tech", "other"]),
    tags: z.array(text),
    links: z.array(z.object({ kind: z.enum(["live", "github"]), href }).strict()),
    // Drafts are only shown to the owner.
    draft: z.boolean(),
    // Hidden projects are left out everywhere (lists, footer, their own page).
    hidden,
    images: z.array(image).optional(),
  })
  .strict();

export const projectsSchema = z
  .object({ projects: z.array(project) })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.projects.forEach((p, i) => {
      if (seen.has(p.slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["projects", i, "slug"],
          message: "duplicate slug",
        });
      }
      seen.add(p.slug);
    });
  });

const social = z
  .object({
    label: text,
    href,
    icon: z.enum(SOCIAL_ICON_NAMES),
    // Also shown as a small icon under the name, like a link-in-bio page.
    quick: z.boolean().optional(),
    // Shown in small type under the label, with a copy button on the row.
    copy: optionalText,
    hidden,
  })
  .strict();

// { include: "emails" } expands to one row per visible site.emails address.
const emailsPlaceholder = z.object({ include: z.literal("emails") }).strict();

export const socialsSchema = z
  .object({ rows: z.array(z.union([emailsPlaceholder, social])) })
  .strict();

function validDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

export const postSchema = z
  .object({
    title: text.pipe(z.string().max(200)),
    date: z.string().refine(validDate, "must be a real date written YYYY-MM-DD"),
    summary: text.pipe(z.string().max(500)),
    body: z
      .string()
      .refine(
        (body) => Buffer.byteLength(body, "utf8") <= MAX_POST_BODY_BYTES,
        `must be at most ${MAX_POST_BODY_BYTES} bytes`,
      ),
    draft: z.boolean().optional(),
  })
  .strict();

export const postSlugSchema = z
  .string()
  .max(80)
  .regex(SLUG_RE, "must be lowercase words joined by hyphens");

export type Site = z.infer<typeof siteSchema>;
export type SiteEmail = Site["emails"][number];
export type SiteLink = Site["links"][number];
export type Home = z.infer<typeof homeSchema>;
export type BalanceItem = Home["balance"]["building"][number];
export type About = z.infer<typeof aboutSchema>;
export type Competition = About["competitions"][number];
export type Club = About["clubs"][number];
export type Hobby = About["hobbies"][number];
export type Testimonial = About["testimonials"][number];
export type ProjectsSection = z.infer<typeof projectsSchema>;
export type Project = ProjectsSection["projects"][number];
export type Socials = z.infer<typeof socialsSchema>;
export type SocialRow = Socials["rows"][number];
export type Social = Exclude<SocialRow, { include: "emails" }>;
export type PostData = z.infer<typeof postSchema>;

export type SectionData = {
  site: Site;
  home: Home;
  about: About;
  projects: ProjectsSection;
  socials: Socials;
};

export const sectionSchemas: { [S in SectionName]: z.ZodType<SectionData[S]> } = {
  site: siteSchema,
  home: homeSchema,
  about: aboutSchema,
  projects: projectsSchema,
  socials: socialsSchema,
};

export type Issue = { path: string; message: string };

// ["projects", 2, "links", 0, "kind"] -> "projects[2].links[0].kind"
function issuePath(path: (string | number)[]): string {
  return path
    .map((part, i) =>
      typeof part === "number" ? `[${part}]` : i === 0 ? part : `.${part}`,
    )
    .join("");
}

export type Validated<T> = { ok: true; data: T } | { ok: false; issues: Issue[] };

function check<T>(schema: z.ZodType<T>, data: unknown): Validated<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((issue) => ({
        path: issuePath(issue.path),
        message: issue.message,
      })),
    };
  }
  if (containsPrivateDetails(JSON.stringify(result.data))) {
    return {
      ok: false,
      issues: [{ path: "", message: "must not contain the private phone number or address" }],
    };
  }
  return { ok: true, data: result.data };
}

export function validateSection<S extends SectionName>(
  section: S,
  data: unknown,
): Validated<SectionData[S]> {
  return check(sectionSchemas[section], data);
}

export function validatePost(data: unknown): Validated<PostData> {
  return check(postSchema, data);
}
