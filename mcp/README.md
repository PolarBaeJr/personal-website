# Site MCP server

Lets Claude Code edit the site through its token-protected API: the résumé
`.tex` sources (`/api/resume/*`), the content sections (`/api/content/*`) and
blog posts (`/api/posts/*`). The tools themselves are in
`src/lib/mcp/tools.ts`; `src/index.ts` only wires them to stdio. It runs with
Node's built-in type stripping, so there is no build output; `npm run build`
only type-checks.

## Setup

1. `npm install` in the repo root (the MCP SDK and zod are root dependencies),
   then `cd mcp && npm install` for the type-checker
2. Put the token in the repo's `.env.local` (gitignored) as
   `RESUME_API_TOKEN=...`, the same value the server has. An exported
   `RESUME_API_TOKEN` in your shell wins if set.
3. Restart Claude Code. The repo's `.mcp.json` starts the server as `resume`.

For local testing, point it at a dev server:

```sh
export RESUME_API_URL=http://localhost:3100
```

## Tools

| Tool | What it does |
| --- | --- |
| `list_resumes` | Current version of every type |
| `list_versions(type)` | History for one type, metadata only |
| `get_resume(type, version?)` | The tex of a version (current by default) |
| `preview_resume(type, tex, save_pdf?)` | Compiles the public PDF without saving; returns the page count and a temp-file path |
| `update_resume(type, tex, note)` | Compiles both PDFs and saves a new current version; a failed compile saves nothing |
| `restore_version(type, version)` | Copies an earlier tex version into a new current version |
| `regenerate_resume(type)` | Recompiles the current version's PDFs in place |
| `list_content` | Current version of every content section, with each section's shape |
| `get_content(section, version?)` | A section's data (current by default) |
| `list_content_versions(section)` | History for one section |
| `update_content(section, data, note, base_version?)` | Saves the whole section as a new version; get it first and send it all back |
| `restore_content(section, version, note?)` | Copies an earlier version into a new current version |
| `reset_content_to_seed(section, note?)` | Saves the repo seed (`src/content/*.ts`) as a new version |
| `list_posts` | Posts (drafts included) and deleted slugs |
| `get_post(slug, version?)` | A post (current by default) |
| `create_post(slug, title, date, summary, body, draft?, note?)` | Publishes a new post |
| `update_post(slug, title, date, summary, body, draft?, note, base_version?)` | Saves a new version of a post |
| `delete_post(slug)` | Takes a post down; history is kept |
| `list_post_versions(slug)` | History for one post |
| `restore_post(slug, version, note?)` | Copies an earlier version into a new current one (also undoes a delete) |

The tex must use `\resumephone` and `\resumeaddress`, never the literal values.
The API rejects tex, content and posts that contain them.

## Without MCP

The same API works with curl:

```sh
curl -sS -X POST \
  -H "Authorization: Bearer $RESUME_API_TOKEN" \
  -H 'content-type: text/plain' \
  --data-binary @resumes/general.tex \
  "https://matthewcheng.net/api/resume/general?note=Tighten+summary"
```

Or use the repo scripts, which read the token from the env, `.env.local` or `.env`:

```sh
npm run resume:pull            # all types into resumes/*.tex
npm run resume:push general "Tighten summary"
```
