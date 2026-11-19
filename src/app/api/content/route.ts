import { ensureContentSeeded, getWriteContentDb } from "@/lib/content-data";
import { listCurrentContent } from "@/lib/content-store/db";
import { SECTIONS } from "@/lib/content-store/schema";
import { authorize, json, logError } from "@/lib/resume-api";

export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    ensureContentSeeded();
    const rows = listCurrentContent(getWriteContentDb(), "");
    return json(
      SECTIONS.map((section) => {
        const row = rows.find((r) => r.meta.section === section);
        return {
          section,
          current: row && {
            version: row.meta.versionNo,
            note: row.meta.note,
            actor: row.meta.actor,
            createdAt: row.meta.createdAt,
          },
          versionCount: row?.versionCount ?? 0,
        };
      }),
    );
  } catch (e) {
    logError("GET /api/content", e);
    return json({ error: "internal" }, 500);
  }
}
