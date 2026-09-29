import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/** Demo server: every spec except the setup wizard runs here. */
const DEMO_URL = "http://127.0.0.1:3737";
/**
 * The setup wizard redirects to "/" in the demo, so a second, unconfigured
 * instance of the same build serves it (fresh data dir, secrets from env:
 * no keychain on CI). It never talks to a mail server or to Jev.
 */
const SETUP_URL = "http://127.0.0.1:3738";

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: DEMO_URL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "npm run build && npm run start",
      url: `${DEMO_URL}/api/status`,
      env: { DEMO_MODE: "1" },
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Starts after the demo server is up, so the build above already exists.
      command: "npx next start -H 127.0.0.1 -p 3738",
      url: `${SETUP_URL}/api/status`,
      env: {
        DEMO_MODE: "0",
        JEV_SECRETS: "env",
        JEV_DATA_DIR: join(tmpdir(), `jev-e2e-setup-${process.pid}`),
      },
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
