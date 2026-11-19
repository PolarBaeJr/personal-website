import { seedSection } from "@/lib/content-data";
import { isSectionName } from "@/lib/content-store/schema";
import { authorize, json } from "@/lib/resume-api";

// The repo seed (src/content/*.ts) for a section, for comparing with the DB.
export async function GET(
  req: Request,
  ctx: RouteContext<"/api/content/[section]/seed">,
) {
  const denied = authorize(req);
  if (denied) return denied;
  const { section } = await ctx.params;
  if (!isSectionName(section)) return json({ error: "unknown_section" }, 404);
  return json({ section, data: seedSection(section) });
}
