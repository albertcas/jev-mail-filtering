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
      // Rows loaded (sidebar or phone selector, list and, from 768px, the reading pane).
      await expect(page.getByRole("option").first()).toBeVisible();
      await audit(page);
    });

    test("no WCAG A/AA violations in the reading pane with a scam selected", async ({ page }, info) => {
      await page.goto("/");
      await page
        .getByRole("navigation", { name: /Categories|Categorías/ })
        .getByRole("button", { name: /Possible scam|Posible estafa/ })
        .click();
      await page.getByRole("option", { name: /Your account has been limited/ }).click();
      const pane =
        info.project.name === "mobile"
          ? page.getByRole("dialog", { name: "Your account has been limited" })
          : page.getByRole("region", { name: "Your account has been limited" });
      await expect(pane).toBeVisible();
      // The move targets are part of the pane: audit them expanded too.
      await pane.getByRole("button", { name: /Not this\? Move to|¿No es esto\? Mover a/ }).click();
      await audit(page);
    });

    test("no WCAG A/AA violations with the Adjust popover open", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("option").first()).toBeVisible();
      await page.getByRole("button", { name: /^(Adjust|Ajustar)/ }).click();
      await expect(page.getByRole("dialog", { name: /Decision thresholds|Umbrales de decisión/ })).toBeVisible();
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
