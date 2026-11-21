import type { About } from "@/lib/content-store/schema";

export type {
  Club,
  Competition,
  Hobby,
  Testimonial,
} from "@/lib/content-store/schema";

// Seed for the "about" section (live copy in the content DB). Empty lists
// hide their section; dates are plain text like "Nov 2026". Any item can
// carry hidden: true to leave it out without deleting it.
// An href starting with "/" stays on site; https opens in a new tab.
export const aboutSeed: About = {
  // Résumé projects with competition: true show automatically; add ones not
  // on your résumé here. result is the placement or award, only if there
  // was one.
  competitions: [
    // {
    //   name: "Competition name",
    //   role: "Team Member",
    //   result: "Placement or award",
    //   start: "Mon YYYY",
    //   href: "https://example.com",
    // },
  ],

  // Keep in sync with resume.ts.
  clubs: [
    // Source: resume.ts experience[0]; href from socials.ts and projects.ts.
    {
      name: "SFU Badminton Club",
      role: "Internal Events Director",
      start: "May 2026",
      href: "https://sfubadminton.com",
    },
    // Source: resume.ts education[0] details ("Member: Accounting Student Association.").
    { name: "Accounting Student Association", role: "Member" },
    { name: "Management Information Systems Association (MISA)", role: "Member" },
    { name: "Economics Student Society", role: "Member" },
    { name: "Hong Kong Society", role: "Member" },
    // { name: "Club name", role: "Role", start: "Mon YYYY", end: "Mon YYYY" },
  ],

  // image.src is a photo uploaded in Admin ("/media/<sha256>.webp", with its
  // width and height), or a local file in public/hobbies/, written
  // "/hobbies/x.jpg" (no web URLs or ? query strings); image.alt is required.
  hobbies: [
    // {
    //   name: "Hobby name",
    //   blurb: "One or two sentences about it.",
    //   image: { src: "/hobbies/example.jpg", alt: "Describe the photo" },
    // },
  ],

  // NEVER add email/phone/LinkedIn or any contact info for the person quoted.
  // Only name, role, org appear. Get their permission first.
  testimonials: [
    // {
    //   quote: "What they said.",
    //   name: "Their name",
    //   role: "Their role",
    //   org: "Their organization",
    // },
  ],
};
