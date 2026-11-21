import crypto from "node:crypto";
import { getWriteContentDb } from "@/lib/content-data";
import { createLink, LINK_MINUTES, MAX_OPEN_LINKS, openLinkCount } from "@/lib/content-store/media";
import { sha256 } from "@/lib/owner-session";
import { authorize, json, logError, readJsonBody } from "@/lib/resume-api";
import { siteOrigin } from "@/lib/site-url";

const MAX_NOTE_CHARS = 200;

// A one-time upload link (MCP create_upload_link): the owner opens it on a
// phone or computer and picks a photo, with no sign-in. Token only.
export async function POST(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  const data = await readJsonBody(req);
  if (data instanceof Response) return data;
  const raw = data && typeof data === "object" ? (data as { note?: unknown }).note : undefined;
  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    return json({ error: "note must be a string" }, 400);
  }
  const note = (raw ?? "").trim().slice(0, MAX_NOTE_CHARS);
  try {
    const db = getWriteContentDb();
    if (openLinkCount(db) >= MAX_OPEN_LINKS) {
      return json(
        {
          error: "too_many_links",
          message: `There are already ${MAX_OPEN_LINKS} unused upload links. Wait for one to be used or to expire (${LINK_MINUTES} minutes).`,
        },
        429,
      );
    }
    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("base64url");
    createLink(db, id, sha256(token), note);
    return json(
      { id, url: `${siteOrigin()}/upload/${token}`, expires_in_minutes: LINK_MINUTES },
      201,
    );
  } catch (e) {
    logError("POST /api/media/links", e);
    return json({ error: "internal" }, 500);
  }
}
