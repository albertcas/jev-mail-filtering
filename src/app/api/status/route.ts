import { JEV_PRICE_PER_TOKEN } from "@/core/config";
import { checkRequest } from "@/server/guard";
import { getContext } from "@/server/context";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const c = await getContext();
  const denied = checkRequest(req, { demo: c.demo, mutating: false });
  if (denied) return denied;
  const totalTokens = c.repo.totalInputTokens();
  return Response.json({
    demo: c.demo,
    configured: c.demo || c.repo.getConfig() !== null,
    hasApiKey: c.demo || (await c.secrets.get("typesafe_api_key")) !== null,
    // Presence only, never the value.
    hasImapPassword: c.demo || (await c.secrets.get("imap_password")) !== null,
    syncing: c.runner.isRunning,
    lastRun: c.repo.lastRun(),
    pending: c.repo.countPending(),
    totalTokens,
    estimatedCostUsd: totalTokens * JEV_PRICE_PER_TOKEN,
    secretsKind: c.secrets.kind,
  });
}
