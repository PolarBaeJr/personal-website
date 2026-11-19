// Edit the lists below; empty lists hide their section; dates are plain text like "Nov 2026".

export type Competition = {
  name: string;
  role?: string;
  // Placement or award, only if there was one.
  result?: string;
  start?: string;
  end?: string;
  // An href starting with "/" stays on site; https opens in a new tab.
  href?: string;
};

export type Club = {
  name: string;
  role?: string;
  start?: string;
  end?: string;
  href?: string;
};

export type HobbyImage = {
  // A local file in public/hobbies/, written "/hobbies/x.jpg". No web URLs or ? query strings.
  src: string;
  // REQUIRED: describe the photo.
  alt: string;
};

export type Hobby = {
  name: string;
  blurb: string;
  image?: HobbyImage;
};

// NEVER add email/phone/LinkedIn or any contact info for the person quoted.
// Only name, role, org appear. Get their permission first.
export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  org: string;
};

// Résumé projects with competition: true show automatically; add ones not on
// your résumé here.
export const competitions: Competition[] = [
  // {
  //   name: "Competition name",
  //   role: "Team Member",
  //   result: "Placement or award",
  //   start: "Mon YYYY",
  //   href: "https://example.com",
  // },
];

// Keep in sync with resume.ts.
export const clubs: Club[] = [
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
  { name: "Economics Society", role: "Member" },
  { name: "Hong Kong Society", role: "Member" },
  // { name: "Club name", role: "Role", start: "Mon YYYY", end: "Mon YYYY" },
];

export const hobbies: Hobby[] = [
  // {
  //   name: "Hobby name",
  //   blurb: "One or two sentences about it.",
  //   image: { src: "/hobbies/example.jpg", alt: "Describe the photo" },
  // },
];

// NEVER add email/phone/LinkedIn or any contact info for the person quoted.
// Only name, role, org appear. Get their permission first.
export const testimonials: Testimonial[] = [
  // {
  //   quote: "What they said.",
  //   name: "Their name",
  //   role: "Their role",
  //   org: "Their organization",
  // },
];
