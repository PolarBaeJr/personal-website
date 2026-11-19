import { getVariantMeta } from "@/lib/resume";
import { authorize, json, logError } from "@/lib/resume-api";
import { ensureSeeded, getWriteDb } from "@/lib/resume-data";
import { listCurrent } from "@/lib/resume-store/db";

export async function GET(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    await ensureSeeded();
    return json(
      listCurrent(getWriteDb()).map(({ type, current, versionCount }) => ({
        type,
        label: getVariantMeta(type).label,
        current: current && {
          version: current.versionNo,
          note: current.note,
          createdAt: current.createdAt,
          hasPdfPublic: current.hasPdfPublic,
        },
        versionCount,
      })),
    );
  } catch (e) {
    logError("GET /api/resume", e);
    return json({ error: "internal" }, 500);
  }
}
