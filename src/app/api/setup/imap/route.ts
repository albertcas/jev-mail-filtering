import { z } from "zod";
import { AppConfigSchema } from "@/core/config";
import { ImapAuthError } from "@/core/mail/imap-source";
import { PROVIDERS } from "@/core/mail/providers";
import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";

const Body = z.object({
  provider: z.enum(["gmail", "icloud", "yahoo", "imap"]),
  host: z.string().optional(),
  port: z.number().int().optional(),
  secure: z.boolean().optional(),
  user: z.string().trim().min(3),
  password: z.string().min(1),
  displayName: z.string().default(""),
});

export async function POST(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: true });
  if (denied) return denied;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  const preset = b.data.provider === "imap" ? null : PROVIDERS[b.data.provider];
  const parsed = AppConfigSchema.safeParse({
    ...(c.repo.getConfig() ?? {}),
    provider: b.data.provider,
    host: preset?.host ?? b.data.host,
    port: preset?.port ?? b.data.port ?? 993,
    secure: preset?.secure ?? b.data.secure ?? true,
    user: b.data.user,
    displayName: b.data.displayName,
  });
  if (!parsed.success) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  const config = parsed.data;
  const source = c.imapSource(config, b.data.password);
  try {
    const folders = await source.listFolders();
    c.repo.setConfig(config);
    if (c.secrets.writable) await c.secrets.set("imap_password", b.data.password);
    c.runner.start(config.intervalMinutes);
    return Response.json({ ok: true, folders });
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof ImapAuthError ? "auth" : "network" });
  } finally {
    await source.close();
  }
}
