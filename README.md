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
| Tagline, about, emails, location, social links, footer lines, avatar (upload in Admin) | `site` | `src/content/site.ts` (`siteSeed`) |
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

## Editing in the browser

Sign in at `/login` to edit the site from any browser, phone included. While signed in, every public page shows an "Edit this page" bar and small "Edit ..." links next to each section; `/admin` lists everything. Drafts (projects and posts) are visible only to you. Each save is a version, so the History page on each section can put an older one back. Visitors never see any of this: `/admin` answers 404 unless you are signed in.

Set up once:

1. Run `npm run owner:hash-password`, type a password (12 characters or more) twice. It prints one line, `OWNER_PASSWORD_HASH=scrypt:...`.
2. Put that line in the server's `.env` (the repo root on the Pi, which `docker/docker-compose.yml` reads; `.env.local` for `npm run dev`) and recreate the container: `docker compose -f docker/docker-compose.yml up -d`. The value uses `:` separators on purpose; a `$` would be mangled by Docker Compose and Next's env loading.
3. Open `/login`.

Turning it off or locking everyone out:

- Remove `OWNER_PASSWORD_HASH` (or leave it empty) and restart. Sign-in and every session stop working at once, and so does every connected app (see below). Putting the same hash back revives them.
- To end every signed-in session but keep sign-in on (for example after using a shared computer): `npm run owner:sign-out-all`, or on the Pi `docker exec personal-page npm run owner:sign-out-all`. It also disconnects every connected app. Changing the password also needs a restart, but old sessions stay valid until you run this; connected apps stop at once with a new password.
- Sessions last 14 days from the last visit. Five wrong passwords from one address pause sign-in there for 15 minutes; twenty in an hour pause it for everyone for an hour.

Behind Cloudflare and the reverse proxy: saving uses Next.js Server Actions, which refuse a request whose `Origin` doesn't match the `Host` (or `X-Forwarded-Host`) the app sees. The proxy must pass the public host name through (`Host: matthewcheng.net`, or `X-Forwarded-Host`). If saving or signing in fails with "didn't reach the site" (and the server log says the `x-forwarded-host` or `host` header "does not match `origin`"), that is the first thing to check.

## Photos

Upload photos from Admin (the profile photo on About you, screenshots on Projects, hobby photos on Other involvements) or with the MCP `upload_image` tool.

- JPEG, PNG or WebP, up to 15 MB and 50 megapixels. An iPhone HEIC photo usually arrives as JPEG from the photo picker; if it doesn't, export it as JPEG.
- Photos are resized to at most 2000px and saved as WebP with all metadata (including location) removed. Each is named by its content hash in `MEDIA_DIR` (`/data/media` on the Pi, inside the data volume, so it is backed up with it).
- Files that are no longer used are kept, so restoring an older version from History keeps working.
- Uploads go to `POST /api/media`, with the API token or the owner session.
- Cloudflare must allow request bodies of 16 MB (the free plan allows 100 MB).

## Using the site from the Claude app

The same tools as the local MCP server (`mcp/`) are served at `https://matthewcheng.net/mcp`, so the Claude app (web, desktop or phone) can edit the site in any chat. It signs in with OAuth: you approve each connection on a page that needs your owner sign-in.

Needs `OWNER_PASSWORD_HASH` and `RESUME_API_TOKEN` set on the server (the tools call the site's own API with the token; it never leaves the server). `SITE_URL` sets the public address if it isn't `https://matthewcheng.net`.

1. In Claude (web or desktop): Settings > Connectors > Add custom connector.
2. Give it a name and the URL `https://matthewcheng.net/mcp`. Leave the advanced OAuth fields empty.
3. Press Connect. Sign in if asked, then press Allow. It then works in any chat, including on your phone.

Edits show in History as "Claude (connected app)". Résumé versions don't record who made them.

To disconnect, open Admin > Connected apps. Changing the password, `npm run owner:sign-out-all` or unsetting `OWNER_PASSWORD_HASH` disconnects everything.

Troubleshooting:

- Cloudflare Bot Fight Mode or WAF rules can block Claude's servers. Allow `/mcp`, `/oauth/*` and `/.well-known/oauth-*`.
- A résumé save that takes over about 100 seconds can hit Cloudflare's proxy timeout. It still finishes on the server; check History.
- The consent page uses a Server Action, so the same Host/Origin note as sign-in applies.
- The tools reach the API at `http://127.0.0.1:$PORT` (3000 by default). For a local `next start`, set `PORT` in the environment rather than passing `-p`, and don't bind only to `::1`.

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
