export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getContext } = await import("@/server/context");
  const c = await getContext();
  if (c.demo) return;
  const config = c.repo.getConfig();
  if (config) {
    c.runner.start(config.intervalMinutes);
    c.runner.trigger().catch((err: unknown) => {
      console.error("[jev] initial sync failed:", err instanceof Error ? err.name : "unknown");
    });
  }
}
