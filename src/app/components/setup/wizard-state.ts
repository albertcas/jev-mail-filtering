/**
 * The setup wizard as a pure state machine: welcome → key → mailbox → scope → syncing.
 * It holds only what is safe to keep: no API key, no password (those live in the
 * step's own input state and are cleared once sent).
 */
export type WizardStep = "welcome" | "key" | "mailbox" | "scope" | "syncing";

export type WizardState = {
  step: WizardStep;
  /** A key was verified in this session, or one is already stored server-side. */
  keyReady: boolean;
  /** Folders listed by the last successful connection test; null until then. */
  folders: string[] | null;
};

export type WizardAction =
  | { type: "start" }
  | { type: "keyReady"; ready: boolean }
  | { type: "mailConnected"; folders: string[] }
  | { type: "mailEdited" }
  | { type: "next" }
  | { type: "back" }
  | { type: "syncStarted" }
  | { type: "syncFailed" };

/** The three numbered steps shown in the progress indicator. */
export const PROGRESS_STEPS = ["key", "mailbox", "scope"] as const;
export type ProgressStep = (typeof PROGRESS_STEPS)[number];

export function initialWizardState(opts: { configured: boolean; keyReady: boolean }): WizardState {
  // Reconfiguring skips the welcome: the user already knows what the app does.
  return { step: opts.configured ? "key" : "welcome", keyReady: opts.keyReady, folders: null };
}

/** Whether the current step's requirement is met, so "Continue" can move on. */
export function canAdvance(s: WizardState): boolean {
  switch (s.step) {
    case "welcome":
      return true;
    case "key":
      return s.keyReady;
    case "mailbox":
      return s.folders !== null;
    case "scope":
      return s.keyReady && s.folders !== null;
    case "syncing":
      return false;
  }
}

const NEXT: Partial<Record<WizardStep, WizardStep>> = { welcome: "key", key: "mailbox", mailbox: "scope" };
const PREV: Partial<Record<WizardStep, WizardStep>> = { key: "welcome", mailbox: "key", scope: "mailbox" };

export function wizardReducer(s: WizardState, a: WizardAction): WizardState {
  switch (a.type) {
    case "start":
      return s.step === "welcome" ? { ...s, step: "key" } : s;
    case "keyReady":
      return { ...s, keyReady: a.ready };
    case "mailConnected":
      return { ...s, folders: a.folders };
    case "mailEdited":
      // The saved connection no longer matches what is on screen: test again.
      return s.folders === null ? s : { ...s, folders: null };
    case "next": {
      const to = NEXT[s.step];
      return to && canAdvance(s) ? { ...s, step: to } : s;
    }
    case "back": {
      const to = PREV[s.step];
      return to ? { ...s, step: to } : s;
    }
    case "syncStarted":
      return s.step === "scope" && canAdvance(s) ? { ...s, step: "syncing" } : s;
    case "syncFailed":
      return s.step === "syncing" ? { ...s, step: "scope" } : s;
  }
}

/** 1-based position among the numbered steps, or null for welcome. */
export function progressIndex(step: WizardStep): number | null {
  if (step === "syncing") return PROGRESS_STEPS.length;
  const i = (PROGRESS_STEPS as readonly string[]).indexOf(step);
  return i === -1 ? null : i + 1;
}

/** INBOX when the server has it (any case), otherwise the first folder. */
export function defaultFolder(folders: readonly string[]): string {
  return folders.find((f) => f.toUpperCase() === "INBOX") ?? folders[0] ?? "INBOX";
}

export const MIN_DAYS = 1;
export const MAX_DAYS = 90;
export const DEFAULT_DAYS = 14;

/** Whole days within 1–90; anything unreadable falls back to the default. */
export function clampDays(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(v)));
}
