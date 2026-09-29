import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";

export async function POST(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: true });
  if (denied) return denied;
  const report = await c.runner.trigger();
  return report ? Response.json(report) : Response.json({ error: "not_configured" }, { status: 409 });
}
