import { describe, expect, it } from "vitest";
import type { AppConfig } from "@/core/config";
import { mergeConfig } from "@/server/merge-config";

const current: AppConfig = {
  provider: "gmail", host: "imap.gmail.com", port: 993, secure: true, user: "a@b.es",
  displayName: "Ana", folder: "Work", days: 30, intervalMinutes: 15, model: "jev-1.13.0",
};

describe("mergeConfig", () => {
  it("keeps every saved field the patch does not mention", () => {
    expect(mergeConfig(current, { intervalMinutes: 30 })).toEqual({ ...current, intervalMinutes: 30 });
  });
  it("rejects invalid patch values", () => {
    expect(() => mergeConfig(current, { days: 500 })).toThrow();
    expect(() => mergeConfig(current, { port: "x" })).toThrow();
  });
  it("ignores unknown keys", () => {
    expect(mergeConfig(current, { evil: 1 })).toEqual(current);
  });
});
