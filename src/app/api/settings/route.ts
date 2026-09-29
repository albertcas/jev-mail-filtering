import { z } from "zod";
import { AppConfigSchema } from "@/core/config";
import { parseThresholds } from "@/core/policy/thresholds";
import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: false });
  if (denied) return denied;
  return Response.json({ config: c.repo.getConfig(), thresholds: c.repo.getThresholds() });
}

const Body = z.object({ config: AppConfigSchema.partial().optional(), thresholds: z.unknown().optional() });

export async function PUT(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: true });
  if (denied) return denied;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "bad_request" }, { status: 400 });
  if (body.data.thresholds !== undefined) c.repo.setThresholds(parseThresholds(body.data.thresholds));
  if (body.data.config) {
    const current = c.repo.getConfig();
    if (!current) return Response.json({ error: "not_configured" }, { status: 409 });
    const next = AppConfigSchema.parse({ ...current, ...body.data.config });
    c.repo.setConfig(next);
    c.runner.start(next.intervalMinutes);
  }
  return Response.json({ ok: true });
}
