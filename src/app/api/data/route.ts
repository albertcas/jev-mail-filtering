import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";
import { wipeLocalData } from "@/server/wipe";

export async function DELETE(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: true });
  if (denied) return denied;
  await wipeLocalData(c);
  return Response.json({ ok: true });
}
