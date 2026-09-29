import { z } from "zod";
import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";

const Body = z.object({ category: z.enum(["needs_reply", "worth_reading", "commercial", "possible_scam", "none", "unsure"]).nullable() });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: true });
  if (denied) return denied;
  const id = Number((await params).id);
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || !body.success) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    c.repo.setOverride(id, body.data.category, new Date());
  } catch {
    return Response.json({ error: "not_found" }, { status: 404 }); // unknown message id (FK violation)
  }
  return Response.json({ ok: true });
}
