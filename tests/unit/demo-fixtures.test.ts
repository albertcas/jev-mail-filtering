import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CATEGORY_LABELS } from "@/core/classify/answers";

const dir = join(fileURLToPath(new URL(".", import.meta.url)), "../../fixtures/demo");
const entries = JSON.parse(readFileSync(join(dir, "source.json"), "utf8")) as { file: string; label: string; lang: string }[];

describe("demo inbox (fixtures/demo)", () => {
  it("has 50 entries with unique file names", () => {
    expect(entries).toHaveLength(50);
    expect(new Set(entries.map((e) => e.file)).size).toBe(50);
  });

  it("uses only known labels and languages", () => {
    for (const e of entries) {
      expect(CATEGORY_LABELS, e.file).toContain(e.label);
      expect(["es", "en"], e.file).toContain(e.lang);
    }
  });

  it("matches the planned label × language distribution", () => {
    const counts: Record<string, number> = {};
    for (const e of entries) counts[`${e.label}/${e.lang}`] = (counts[`${e.label}/${e.lang}`] ?? 0) + 1;
    expect(counts).toEqual({
      "needs_reply/es": 6, "needs_reply/en": 6,
      "worth_reading/es": 6, "worth_reading/en": 6,
      "commercial/es": 6, "commercial/en": 6,
      "possible_scam/es": 6, "possible_scam/en": 6,
      "none/es": 1, "none/en": 1,
    });
  });

  it("has exactly one generated .eml per entry", () => {
    const emls = readdirSync(join(dir, "eml")).filter((f) => f.endsWith(".eml")).sort();
    expect(emls).toEqual(entries.map((e) => `${e.file}.eml`).sort());
  });
});
