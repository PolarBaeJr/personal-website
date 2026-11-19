# Résumé MCP server

Lets Claude Code read, preview and update the résumé `.tex` sources through the
site's token-protected API (`/api/resume/*`). It runs with Node's built-in type
stripping, so there is no build output; `npm run build` only type-checks.

## Setup

1. `cd mcp && npm install`
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

The tex must use `\resumephone` and `\resumeaddress`, never the literal values.
The API rejects tex that contains them.

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
