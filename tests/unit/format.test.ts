import { describe, expect, it } from "vitest";
import { formatCost, formatRelative, formatScore, percent } from "@/app/components/dashboard/format";

// Intl uses (narrow) no-break spaces in some locales; compare with plain spaces.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("formatCost", () => {
  it("shows zero with two decimals", () => {
    expect(formatCost(0, "en")).toBe("$0.00");
  });
  it("uses four decimals under one cent", () => {
    expect(formatCost(0.00038556, "en")).toBe("$0.0004");
    expect(formatCost(0.0099, "en")).toBe("$0.0099");
  });
  it("uses two decimals from one cent up", () => {
    expect(formatCost(0.01, "en")).toBe("$0.01");
    expect(formatCost(1.5, "en")).toBe("$1.50");
  });
  it("follows the locale", () => {
    expect(plain(formatCost(0.0004, "es"))).toBe("0,0004 US$");
  });
});

describe("formatRelative", () => {
  const now = Date.UTC(2026, 8, 29, 12, 0, 0);
  const ago = (s: number) => now - s * 1000;
  it("says now under a minute", () => {
    expect(formatRelative(ago(20), now, "en")).toBe("now");
  });
  it("picks the largest whole unit", () => {
    expect(formatRelative(ago(5 * 60), now, "en")).toBe("5 minutes ago");
    expect(formatRelative(ago(2 * 3600), now, "en")).toBe("2 hours ago");
    expect(formatRelative(ago(24 * 3600), now, "en")).toBe("yesterday");
    expect(formatRelative(ago(14 * 24 * 3600), now, "en")).toBe("2 weeks ago");
    expect(formatRelative(ago(60 * 24 * 3600), now, "en")).toBe("2 months ago");
    expect(formatRelative(ago(400 * 24 * 3600), now, "en")).toBe("last year");
  });
  it("follows the locale", () => {
    expect(formatRelative(ago(5 * 60), now, "es")).toBe("hace 5 minutos");
  });
});

describe("percent", () => {
  it("formats whole percentages per locale", () => {
    expect(percent(0.82, "en")).toBe("82%");
    expect(plain(percent(0.82, "es"))).toBe("82 %");
    expect(percent(0.005, "en")).toBe("1%");
  });
  it("treats non-finite values as zero", () => {
    expect(percent(Number.NaN, "en")).toBe("0%");
  });
});

describe("formatScore", () => {
  it("uses the locale's decimal separator", () => {
    expect(formatScore(2.8, "en")).toBe("2.8");
    expect(formatScore(2.8, "es")).toBe("2,8");
    expect(formatScore(2, "es")).toBe("2,0");
  });
});
