import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });
if (existsSync(join(root, "public"))) cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
cpSync(join(root, "messages"), join(standalone, "messages"), { recursive: true });
cpSync(join(root, "fixtures", "demo"), join(standalone, "fixtures", "demo"), { recursive: true });
// npm never publishes nested node_modules, and native modules must be built for the user's OS/arch anyway.
// server.js resolves `next`, `react`, `better-sqlite3`… by walking up to the node_modules npm installs for the user.
rmSync(join(standalone, "node_modules"), { recursive: true, force: true });
// next build copies .env / .env.production into the standalone output: they hold local secrets.
for (const name of readdirSync(standalone)) {
  if (!name.startsWith(".env")) continue;
  console.warn(`warning: removing ${name} from the standalone output (never published)`);
  rmSync(join(standalone, name), { force: true });
}
console.log("standalone package prepared");
