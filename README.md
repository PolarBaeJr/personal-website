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
| Name, tagline, about, email, social links | `src/content/site.ts` (`site`) |
| Navigation | `src/content/site.ts` (`nav`) — add a line plus its route folder in `src/app/` |
| Projects | `src/content/projects.ts` (set `draft: false` when ready) |
| Résumé content | `src/content/resume.ts` |
| Résumé PDF | `public/resume.pdf` (served at `/resume.pdf`) |
| Blog posts | `content/posts/*.md` (filename = URL slug) |
| Playground experiments | `src/app/playground/<name>/page.tsx` |
| Colours, fonts, spacing, layout | Tokens at the top of `src/app/globals.css` |
| Favicon | `src/app/favicon.ico` |

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
