import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import {
  canAdvance,
  clampDays,
  defaultFolder,
  initialWizardState,
  progressIndex,
  wizardReducer,
  type WizardState,
} from "@/app/components/setup/wizard-state";
import { PROVIDER_IDS, providerGuide } from "@/app/components/setup/guide";
import { intervalOptions, intervalUnit, normalizeModel } from "@/app/components/settings/intervals";

const at = (over: Partial<WizardState>): WizardState => ({ step: "welcome", keyReady: false, folders: null, ...over });

describe("wizard state", () => {
  it("starts at welcome, or at the key step when reconfiguring", () => {
    expect(initialWizardState({ configured: false, keyReady: false }).step).toBe("welcome");
    expect(initialWizardState({ configured: true, keyReady: true })).toEqual({ step: "key", keyReady: true, folders: null });
  });

  it("walks welcome → key → mailbox → scope → syncing only when each step is satisfied", () => {
    let s = wizardReducer(at({}), { type: "start" });
    expect(s.step).toBe("key");
    expect(wizardReducer(s, { type: "next" }).step).toBe("key"); // no key yet
    s = wizardReducer(s, { type: "keyReady", ready: true });
    s = wizardReducer(s, { type: "next" });
    expect(s.step).toBe("mailbox");
    expect(wizardReducer(s, { type: "next" }).step).toBe("mailbox"); // not connected yet
    s = wizardReducer(s, { type: "mailConnected", folders: ["INBOX", "Archive"] });
    s = wizardReducer(s, { type: "next" });
    expect(s.step).toBe("scope");
    s = wizardReducer(s, { type: "syncStarted" });
    expect(s.step).toBe("syncing");
    expect(canAdvance(s)).toBe(false);
  });

  it("forgets the connection when the mailbox fields change", () => {
    const s = wizardReducer(at({ step: "mailbox", folders: ["INBOX"] }), { type: "mailEdited" });
    expect(s.folders).toBeNull();
    expect(canAdvance(s)).toBe(false);
  });

  it("goes back one step and returns to scope when the first sync cannot start", () => {
    expect(wizardReducer(at({ step: "scope" }), { type: "back" }).step).toBe("mailbox");
    expect(wizardReducer(at({ step: "key" }), { type: "back" }).step).toBe("welcome");
    expect(wizardReducer(at({ step: "welcome" }), { type: "back" }).step).toBe("welcome");
    expect(wizardReducer(at({ step: "syncing", keyReady: true, folders: [] }), { type: "syncFailed" }).step).toBe("scope");
  });

  it("does not start syncing from another step or without prerequisites", () => {
    expect(wizardReducer(at({ step: "mailbox", keyReady: true, folders: [] }), { type: "syncStarted" }).step).toBe("mailbox");
    expect(wizardReducer(at({ step: "scope", keyReady: false, folders: [] }), { type: "syncStarted" }).step).toBe("scope");
  });

  it("numbers the progress steps 1–3", () => {
    expect(progressIndex("welcome")).toBeNull();
    expect(progressIndex("key")).toBe(1);
    expect(progressIndex("scope")).toBe(3);
    expect(progressIndex("syncing")).toBe(3);
  });

  it("picks INBOX in any case, else the first folder", () => {
    expect(defaultFolder(["Archive", "Inbox"])).toBe("Inbox");
    expect(defaultFolder(["Archive", "Sent"])).toBe("Archive");
    expect(defaultFolder([])).toBe("INBOX");
  });

  it("clamps days to 1–90", () => {
    expect(clampDays(0)).toBe(1);
    expect(clampDays(200)).toBe(90);
    expect(clampDays(7.4)).toBe(7);
    expect(clampDays(Number.NaN)).toBe(14);
  });
});

describe("provider guides", () => {
  it("link to the provider's app-password page and the repository guide", () => {
    const g = providerGuide("gmail");
    expect(g.appPasswordUrl).toBe("https://myaccount.google.com/apppasswords");
    expect(g.docsUrl).toBe("https://github.com/albertcas/jev-mail-filtering/blob/main/docs/setup/gmail.md");
    expect(providerGuide("imap").appPasswordUrl).toBeNull();
  });

  it("have three translated steps for every provider in both languages", () => {
    for (const p of PROVIDER_IDS) {
      for (const key of providerGuide(p).steps) {
        const path = key.split(".");
        const pick = (o: unknown) => path.reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], o);
        expect(typeof pick(en), `${key} (en)`).toBe("string");
        expect(typeof pick(es), `${key} (es)`).toBe("string");
      }
    }
  });
});

describe("settings helpers", () => {
  it("offers the standard intervals plus a custom saved one", () => {
    expect(intervalOptions(15)).toEqual([5, 15, 30, 60, 120, 360, 720, 1440]);
    expect(intervalOptions(45)).toContain(45);
    expect(intervalOptions(3)).not.toContain(3);
  });

  it("labels whole hours as hours", () => {
    expect(intervalUnit(30)).toEqual({ unit: "minutes", count: 30 });
    expect(intervalUnit(120)).toEqual({ unit: "hours", count: 2 });
    expect(intervalUnit(90)).toEqual({ unit: "minutes", count: 90 });
  });

  it("accepts a model id without spaces", () => {
    expect(normalizeModel("  jev-1.13.0 ")).toBe("jev-1.13.0");
    expect(normalizeModel("")).toBeNull();
    expect(normalizeModel("jev latest")).toBeNull();
  });
});
