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

Site content lives in a SQLite DB (`content.db`, next to the résumé DB; `CONTENT_DB` overrides the path) and is edited through the token-protected API (`/api/content/*`, `/api/posts/*`) or the MCP server in `mcp/`. Changes go live at once, without a rebuild, and every save is a version you can restore.

The files under `src/content/` and `content/posts/` are now seeds: they fill the DB the first time it is created, and the site falls back to them when there is no DB (for example during `next build`). Editing a seed does not change the live site by itself; run `reset_content_to_seed` (or `POST /api/content/<section>/reset`) to apply it.

| What | Section | Seed |
| --- | --- | --- |
| Tagline, about, emails, location, social links, footer lines, avatar | `site` | `src/content/site.ts` (`siteSeed`) |
| Featured projects, home experience, home T-account | `home` | `src/content/home.ts` |
| Competitions, clubs, hobbies, testimonials | `about` | `src/content/about.ts` |
| Projects (drafts and hidden ones are not shown to visitors) | `projects` | `src/content/projects.ts` |
| Link-in-bio page (`/socials`) | `socials` | `src/content/socials.ts` |
| Blog posts | `post:<slug>` | `content/posts/*.md` (filename = URL slug) |

Still in code:

| What | Where |
| --- | --- |
| Name and site description | `src/content/site.ts` (`siteIdentity`) |
| Navigation | `src/content/site.ts` (`nav`): add a line plus its route folder in `src/app/(site)/` |
| Résumé content | `resumes/<type>.tex`, edited through the résumé API |
| Résumé versions (labels, audiences, section order) | `src/content/resume.ts` (`variantConfig`); the list of versions is in `src/lib/resume-types.ts` |
| Contact page reasons | `src/app/(site)/contact/page.tsx` |
| Playground experiments | `src/app/(site)/playground/<name>/page.tsx` |
| Colours, fonts, spacing, layout | Tokens at the top of `src/app/globals.css` |
| Favicon | `src/app/favicon.ico` |

Pages with the site header and footer live in `src/app/(site)/`; `/socials` lives in `src/app/(links)/` and has neither. The folder names in brackets don't appear in URLs.

## Blog post format

Seed posts in `content/posts/` use frontmatter:

```md
---
title: "Post title"
date: "2026-11-18"
summary: "One-line summary shown on the blog index."
---

Markdown body…
```

`title`, `date` and `summary` are required; a seed missing any is logged and skipped. Quote the date. Posts are sorted newest first. Raw HTML in the body is shown as text, not rendered.

## Notes for this Next.js version

- `cacheComponents: true` is on (Cache Components). Pages are prerendered at build time.
- Don't use `new Date()`, `Date.now()` or `Math.random()` while rendering; they break prerendering. (That's why the footer has no copyright year.)
- Read files with sync `fs` APIs (`readFileSync`, `readdirSync`, `existsSync`), not `fs/promises`.
- `params` is a Promise: `const { slug } = await params`. Type pages with the global `PageProps<"/route">`.
- `generateStaticParams` must return at least one entry. When a list is empty we return a `__none__` placeholder, which renders `notFound()`.
- Docs for this exact version live in `node_modules/next/dist/docs/`.
