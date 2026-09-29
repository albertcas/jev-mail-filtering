import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Unconfigured instance started by playwright.config.ts (the demo has no /setup). */
const SETUP_URL = "http://127.0.0.1:3738";
const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Wait for finite CSS animations/transitions (step and sheet entrances) so colors are measured at rest. */
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

async function audit(page: Page) {
  await settle(page);
  const r = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  // Compact output on failure: rule id, impact and the offending selectors.
  const found = r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")) }));
  expect(found).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme });
    });

    test("no WCAG A/AA violations on the dashboard", async ({ page }) => {
      await page.goto("/");
      // Cards loaded (the visible column on phones).
      await expect(page.locator("main li button").first()).toBeVisible();
      await audit(page);
    });

    test("no WCAG A/AA violations in the open detail sheet", async ({ page }, info) => {
      await page.goto("/");
      if (info.project.name === "mobile") await page.getByRole("tab", { name: /Possible scam|Posible estafa/ }).click();
      await page.getByText("Your account has been limited").click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await audit(page);
    });

    test("no WCAG A/AA violations in Settings", async ({ page }) => {
      await page.goto("/settings");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page);
    });

    test("no WCAG A/AA violations in the setup wizard", async ({ page }) => {
      // The demo redirects /setup to "/": the unconfigured instance serves it.
      await page.goto(`${SETUP_URL}/setup`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page);
      // First real step (API key form).
      await page.getByRole("button", { name: /Connect my inbox|Conectar mi bandeja/ }).click();
      await expect(page.getByLabel(/API key|Clave de API/).first()).toBeVisible();
      await audit(page);
    });
  });
}
