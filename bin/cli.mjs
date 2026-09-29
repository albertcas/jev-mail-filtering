#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const port = process.env.PORT ?? "3737";
const url = `http://127.0.0.1:${port}`;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = join(root, ".next", "standalone", "server.js");

const child = spawn(process.execPath, [server], {
  cwd: join(root, ".next", "standalone"),
  stdio: "inherit",
  env: { ...process.env, PORT: port, HOSTNAME: "127.0.0.1", NODE_ENV: "production", ...(args.has("--demo") ? { DEMO_MODE: "1" } : {}) },
});

if (!args.has("--no-open")) {
  const waitUntilUp = async () => {
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${url}/api/status`)).ok) return true; } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  };
  waitUntilUp().then(async (up) => {
    console.log(up ? `\n  JEV Mail Filtering → ${url}\n` : `\n  Server did not start; see logs above.\n`);
    if (up) (await import("open")).default(url).catch(() => undefined);
  });
}

for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
