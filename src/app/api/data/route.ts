import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";

export async function DELETE(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: true });
  if (denied) return denied;
  c.runner.stop();
  c.repo.wipe();
  if (c.secrets.writable) {
    await c.secrets.delete("typesafe_api_key");
    await c.secrets.delete("imap_password");
  }
  return Response.json({ ok: true });
}
