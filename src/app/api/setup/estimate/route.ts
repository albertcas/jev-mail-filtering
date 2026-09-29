import { z } from "zod";
import { AVG_TOKENS_PER_EMAIL, JEV_PRICE_PER_TOKEN, MAX_MESSAGES_PER_SYNC } from "@/core/config";
import { ImapAuthError } from "@/core/mail/imap-source";
import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";

export async function POST(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: true });
  if (denied) return denied;
  const b = z.object({ folder: z.string().min(1), days: z.number().int().min(1).max(90) }).safeParse(await req.json().catch(() => null));
  const config = c.repo.getConfig();
  const password = await c.secrets.get("imap_password");
  if (!b.success || !config || !password) return Response.json({ error: "bad_request" }, { status: 400 });
  const source = c.imapSource(config, password);
  try {
    const found = await source.countSince(b.data.folder, new Date(Date.now() - b.data.days * 86_400_000));
    const count = Math.min(found, MAX_MESSAGES_PER_SYNC);
    const estimatedTokens = count * AVG_TOKENS_PER_EMAIL;
    c.repo.setConfig({ ...config, folder: b.data.folder, days: b.data.days });
    return Response.json({ count, estimatedTokens, estimatedCostUsd: estimatedTokens * JEV_PRICE_PER_TOKEN });
  } catch (err) {
    // Never log or echo the error: it may carry connection details.
    return err instanceof ImapAuthError
      ? Response.json({ error: "auth" }, { status: 502 })
      : Response.json({ error: "network" }, { status: 502 });
  } finally {
    await source.close();
  }
}
