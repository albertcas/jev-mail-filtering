import { parseThresholds } from "@/core/policy/thresholds";
import { toDashboardItems } from "@/server/dashboard";
import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: false });
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const saved = c.repo.getThresholds();
  const thresholds = q.size > 0
    ? parseThresholds({ ...saved, ...Object.fromEntries([...q.entries()].filter(([k]) => k in saved)) })
    : saved;
  return Response.json({ items: toDashboardItems(c.repo.listClassified(), thresholds), thresholds });
}
