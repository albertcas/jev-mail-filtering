import { expect, test, type Page, type TestInfo } from "@playwright/test";

const SCAM_SUBJECT = "Your account has been limited";
const SCAM = /Possible scam|Posible estafa/;
const ADVISORY = /Guidance only|Solo orientativo/;
const UNSURE = /Unsure|Sin clasificar/;

const isMobile = (info: TestInfo) => info.project.name === "mobile";

/**
 * A category entry: the dark sidebar (from 768px) or the top selector on
 * phones. Both are buttons named "<Category> <count>" inside the Categories nav.
 */
function category(page: Page, name: RegExp) {
  return page.getByRole("navigation", { name: /Categories|Categorías/ }).getByRole("button", { name });
}

/** A row of the message list (listbox option) by subject. */
function row(page: Page, subject: string) {
  return page.getByRole("option", { name: new RegExp(subject) });
}

/** Where an email's detail shows: the reading pane (region named by the subject) or, on phones, the sheet. */
function detail(page: Page, info: TestInfo, subject: string) {
  return isMobile(info) ? page.getByRole("dialog", { name: subject }) : page.getByRole("region", { name: subject });
}

async function openScam(page: Page, info: TestInfo) {
  await category(page, SCAM).click();
  await expect(category(page, SCAM)).toHaveAttribute("aria-current", "true");
  await row(page, SCAM_SUBJECT).click();
  const pane = detail(page, info, SCAM_SUBJECT);
  await expect(pane).toBeVisible();
  return pane;
}

test("demo dashboard shows the classified inbox", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Demo with fictional data|Demo con datos ficticios/).filter({ visible: true })).toBeVisible();
  for (const name of [/Needs reply|Necesario contestar/, SCAM, /Commercial|Comercial/, UNSURE, /Others|Otros/]) {
    const entry = category(page, name);
    await expect(entry).toBeVisible();
    // The entry is named with its count, e.g. "Possible scam 12".
    await expect(entry).toHaveAccessibleName(/\s\d+$/);
  }
  // Needs reply is selected first and lists its emails.
  await expect(category(page, /Needs reply|Necesario contestar/)).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("listbox")).toBeVisible();
  await category(page, SCAM).click();
  await expect(row(page, SCAM_SUBJECT)).toBeVisible();
  await expect(page.getByText(ADVISORY).first()).toBeVisible();
});

test("detail explains the scam decision", async ({ page }, info) => {
  await page.goto("/");
  const pane = await openScam(page, info);
  await expect(pane.getByText(/Domain resembles paypal|Dominio parecido a paypal/).first()).toBeVisible();
  await expect(pane.getByText(/Sender authentication failed|Autenticación del remitente fallida/).first()).toBeVisible();
  // Scam detection is guidance (spec §7.2), and demo Message-IDs are fictional: no Gmail link.
  await expect(pane.getByText(ADVISORY)).toBeVisible();
  await expect(pane.getByRole("heading", { name: /^(Reasons|Motivos)$/ })).toBeVisible();
  await expect(pane.getByRole("heading", { name: /^(Preview|Vista previa)$/ })).toBeVisible();
  await expect(pane.getByRole("link", { name: /Open in Gmail|Abrir en Gmail/ })).toHaveCount(0);
  // Demo is read-only: moving is offered but disabled.
  await pane.getByRole("button", { name: /Not this\? Move to|¿No es esto\? Mover a/ }).click();
  await expect(pane.getByRole("group").getByRole("button").first()).toBeDisabled();
  if (isMobile(info)) {
    await page.keyboard.press("Escape");
    await expect(pane).toBeHidden();
    // Focus goes back to the row that opened it.
    await expect(row(page, SCAM_SUBJECT)).toBeFocused();
  }
});

test("keyboard moves the selection and opens the reading pane", async ({ page }, info) => {
  test.skip(isMobile(info), "arrow-key navigation is a desktop interaction");
  await page.goto("/");
  const options = page.getByRole("option");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await options.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(options.nth(1)).toBeFocused();
  await expect(options.first()).toHaveAttribute("aria-selected", "false");
  const subjectId = (await options.nth(1).getAttribute("aria-labelledby"))!.split(" ")[1]!;
  const subject = (await page.locator(`[id="${subjectId}"]`).textContent())!;
  // Enter moves focus into the reading pane showing that email; Esc returns to the row.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: subject })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(options.nth(1)).toBeFocused();
  await page.keyboard.press("End");
  await expect(options.last()).toHaveAttribute("aria-selected", "true");
});

test("thresholds recompute without calling sync", async ({ page }, info) => {
  let syncCalls = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/sync")) syncCalls++;
  });
  await page.goto("/");
  const unsure = category(page, UNSURE);
  const count = unsure.locator("[data-count]");
  await expect(count).toHaveText(/^\d+$/);
  const before = (await count.textContent()) ?? "";

  const adjust = page.getByRole("button", { name: /^(Adjust|Ajustar)/ });
  if (isMobile(info)) await adjust.click();
  else {
    // `A` toggles the popover from the list; focus lands on the first slider.
    await page.getByRole("option").first().focus();
    await page.keyboard.press("a");
  }
  await expect(adjust).toHaveAttribute("aria-expanded", "true");
  const popover = page.getByRole("dialog", { name: /Decision thresholds|Umbrales de decisión/ });
  await expect(popover.getByRole("slider").first()).toBeFocused();
  // The demo cannot persist thresholds: no Save.
  await expect(popover.getByRole("button", { name: /^(Save|Guardar)$/ })).toHaveCount(0);

  await popover.getByLabel(/Minimum confidence|Confianza mínima/).fill("0.95");
  await expect(count).not.toHaveText(before);
  expect(syncCalls).toBe(0);

  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(adjust).toBeFocused();
});

test("writes are blocked in demo", async ({ request }) => {
  const r = await request.post("/api/sync", { headers: { origin: "http://127.0.0.1:3737" } });
  expect(r.status()).toBe(403);
  const o = await request.put("/api/messages/1/override", {
    headers: { origin: "http://127.0.0.1:3737", "content-type": "application/json" },
    data: { category: "commercial" },
  });
  expect(o.status()).toBe(403);
});

test("mail content is rendered as text, never HTML", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator("main img[src^='http']")).toHaveCount(0);
  const pane = await openScam(page, info);
  await expect(page.locator("img[src^='http'], iframe")).toHaveCount(0);
  // The excerpt's URLs stay inert text.
  await expect(pane.getByText(/paypa1-secure\.com\/login/)).toBeVisible();
  await expect(pane.locator("a[href*='paypa1']")).toHaveCount(0);
});

test("outside the demo, pages and API refuse non-local Host headers (DNS rebinding)", async ({ request }) => {
  const SETUP_URL = "http://127.0.0.1:3738";
  for (const path of ["/settings", "/setup", "/api/status"]) {
    expect((await request.get(`${SETUP_URL}${path}`, { headers: { host: "rebind.attacker.example:3738" }, maxRedirects: 0 })).status()).toBe(403);
  }
  expect((await request.get(`${SETUP_URL}/api/status`)).status()).toBe(200);
});
