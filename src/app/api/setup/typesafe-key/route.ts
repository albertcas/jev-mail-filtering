import { AuthenticationError, TypeSafeClient } from "@typesafe-ai/sdk";
import { z } from "zod";
import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";

export async function POST(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: true });
  if (denied) return denied;
  const body = z.object({ apiKey: z.string().trim().min(10) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ ok: false, error: "invalid_key" }, { status: 400 });
  try {
    const client = new TypeSafeClient({ apiKey: body.data.apiKey, logLevel: "off" });
    const models = await client.models.list();
    if (c.secrets.writable) await c.secrets.set("typesafe_api_key", body.data.apiKey);
    return Response.json({ ok: true, models: models.map((m) => m.name) });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof AuthenticationError ? "invalid_key" : "network" });
  }
}
