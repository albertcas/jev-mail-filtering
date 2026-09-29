import { expect, test, type Page, type TestInfo } from "@playwright/test";

const SCAM_SUBJECT = "Your account has been limited";

const isMobile = (info: TestInfo) => info.project.name === "mobile";

/**
 * Below 768px the columns are tabs (name + count) and only the selected one is
 * shown; from md up every column has a heading "Name <count>". Returns the
 * element that carries a column's name and count on this viewport.
 */
function columnLabel(page: Page, info: TestInfo, name: RegExp) {
  return isMobile(info) ? page.getByRole("tab", { name }) : page.getByRole("heading", { name });
}

/** Make a column's cards visible (selects its tab on phones). */
async function showColumn(page: Page, info: TestInfo, name: RegExp) {
  if (isMobile(info)) {
    const tab = page.getByRole("tab", { name });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
  }
}

const SCAM = /Possible scam|Posible estafa/;
const ADVISORY = /Guidance only|Solo orientativo/;

test("demo dashboard shows the classified inbox", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByText(/Demo with fictional data|Demo con datos ficticios/)).toBeVisible();
  for (const name of [/Needs reply|Necesario contestar/, SCAM, /Commercial|Comercial/]) {
    const label = columnLabel(page, info, name);
    await expect(label).toBeVisible();
    // The label carries the count, e.g. "Possible scam 7".
    await expect(label).toHaveText(/\d+\s*$/);
  }
  await showColumn(page, info, SCAM);
  await expect(page.getByText(SCAM_SUBJECT)).toBeVisible();
  await expect(page.getByText(ADVISORY)).toBeVisible();
});

test("detail explains the scam decision", async ({ page }, info) => {
  await page.goto("/");
  await showColumn(page, info, SCAM);
  await page.getByText(SCAM_SUBJECT).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Domain resembles paypal|Dominio parecido a paypal/).first()).toBeVisible();
  await expect(dialog.getByText(/Sender authentication failed|Autenticación del remitente fallida/).first()).toBeVisible();
  // Scam detection is guidance (spec §7.2), and demo Message-IDs are fictional: no Gmail link.
  await expect(dialog.getByText(ADVISORY)).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Open in Gmail|Abrir en Gmail/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("thresholds recompute without calling sync", async ({ page }, info) => {
  let syncCalls = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/sync")) syncCalls++;
  });
  await page.goto("/");
  const unsure = columnLabel(page, info, /Unsure|Sin clasificar/);
  await expect(unsure).toHaveText(/\d+\s*$/);
  const before = (await unsure.textContent()) ?? "";

  const slider = page.getByLabel(/Minimum confidence|Confianza mínima/);
  // Phones start with the threshold panel collapsed.
  if (!(await slider.isVisible())) {
    await page.getByRole("button", { name: /Decision thresholds|Umbrales de decisión/ }).click();
  }
  await expect(slider).toBeVisible();
  await slider.fill("0.95");
  await expect(unsure).not.toHaveText(before);
  expect(syncCalls).toBe(0);
});

test("writes are blocked in demo", async ({ request }) => {
  const r = await request.post("/api/sync", { headers: { origin: "http://127.0.0.1:3737" } });
  expect(r.status()).toBe(403);
});

test("mail content is rendered as text, never HTML", async ({ page }, info) => {
  await page.goto("/");
  await showColumn(page, info, SCAM);
  await expect(page.getByText(SCAM_SUBJECT)).toBeVisible();
  await expect(page.locator("main img[src^='http']")).toHaveCount(0);
  await page.getByText(SCAM_SUBJECT).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("img[src^='http'], iframe")).toHaveCount(0);
});

test("outside the demo, pages and API refuse non-local Host headers (DNS rebinding)", async ({ request }) => {
  const SETUP_URL = "http://127.0.0.1:3738";
  for (const path of ["/settings", "/setup", "/api/status"]) {
    expect((await request.get(`${SETUP_URL}${path}`, { headers: { host: "rebind.attacker.example:3738" }, maxRedirects: 0 })).status()).toBe(403);
  }
  expect((await request.get(`${SETUP_URL}/api/status`)).status()).toBe(200);
});
