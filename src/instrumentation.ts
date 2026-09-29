export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getContext } = await import("@/server/context");
  const c = await getContext();
  if (c.demo) return;
  const config = c.repo.getConfig();
  if (config) {
    c.runner.start(config.intervalMinutes);
    void c.runner.trigger();
  }
}
