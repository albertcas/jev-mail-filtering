import { z } from "zod";
import { checkRequest } from "@/server/guard";

export async function POST(req: Request) {
  // Changing language is harmless and must work in the demo, so only the local host/origin check applies outside it.
  if (process.env.DEMO_MODE !== "1") {
    const blocked = checkRequest(req, { demo: false, mutating: true });
    if (blocked) return blocked;
  }
  const b = z.object({ locale: z.enum(["en", "es"]) }).safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ error: "bad_request" }, { status: 400 });
  return Response.json({ ok: true }, { headers: { "set-cookie": `locale=${b.data.locale}; Path=/; Max-Age=31536000; SameSite=Lax` } });
}
