# Personal Page

Personal site: accounting student who also builds software. Next.js 16 (App Router), React 19, Tailwind v4.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the build
npm run lint
```

## Where to edit

| What | Where |
| --- | --- |
| Name, tagline, about, emails, location, social links, footer lines | `src/content/site.ts` (`site`) |
| Home page T-account (Accounting / Building sides) | `src/content/site.ts` (`site.balance`) |
| Navigation | `src/content/site.ts` (`nav`): add a line plus its route folder in `src/app/(site)/` |
| Projects | `src/content/projects.ts` (set `draft: false` when ready, `featured: true` to show on the home page) |
| Résumé content | `src/content/resume.ts` (tag an entry with `types` to limit it to some versions) |
| Résumé versions (labels, audiences, section order) | `src/content/resume.ts` (`variantConfig`); the list of versions is in `src/lib/resume-types.ts` |
| Résumé PDF | Placeholder at `/resume/<type>/document` (`src/app/(site)/resume/[type]/document/page.tsx`) |
| Link-in-bio page (`/socials`) | `src/content/socials.ts`; set `site.avatar` to show a photo instead of initials |
| Contact page | `src/app/(site)/contact/page.tsx` (reads `site.emails` and `site.links`) |
| Blog posts | `content/posts/*.md` (filename = URL slug) |
| Playground experiments | `src/app/(site)/playground/<name>/page.tsx` |
| Colours, fonts, spacing, layout | Tokens at the top of `src/app/globals.css` |
| Favicon | `src/app/favicon.ico` |

Pages with the site header and footer live in `src/app/(site)/`; `/socials` lives in `src/app/(links)/` and has neither. The folder names in brackets don't appear in URLs.

## Blog post format

```md
---
title: "Post title"
date: "2026-11-18"
summary: "One-line summary shown on the blog index."
---

Markdown body…
```

`title`, `date` and `summary` are required; the build fails with a message naming the file if any are missing. Quote the date. Posts are sorted newest first. The HTML is not sanitised, so only publish your own content.

## Notes for this Next.js version

- `cacheComponents: true` is on (Cache Components). Pages are prerendered at build time.
- Don't use `new Date()`, `Date.now()` or `Math.random()` while rendering; they break prerendering. (That's why the footer has no copyright year.)
- Read files with sync `fs` APIs (`readFileSync`, `readdirSync`, `existsSync`), not `fs/promises`.
- `params` is a Promise: `const { slug } = await params`. Type pages with the global `PageProps<"/route">`.
- `generateStaticParams` must return at least one entry. When a list is empty we return a `__none__` placeholder, which renders `notFound()`.
- Docs for this exact version live in `node_modules/next/dist/docs/`.
