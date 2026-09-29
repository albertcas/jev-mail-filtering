import { describe, expect, it } from "vitest";
import {
  NAV,
  groupByCategory,
  isTypingTarget,
  neighborId,
  nextIndex,
  resolveSelection,
  urgencyLevel,
} from "@/app/components/dashboard/inbox";
import type { DashboardItem } from "@/server/dashboard";

const item = (id: number, over: Partial<DashboardItem> = {}): DashboardItem => ({
  id,
  messageId: `<${id}@x>`,
  fromName: "",
  fromAddress: `a${id}@x.test`,
  subject: `s${id}`,
  excerpt: "",
  date: id * 1000,
  category: "worth_reading",
  confidence: 0.9,
  urgency: null,
  reasons: [],
  overridden: false,
  detail: {
    probabilities: { needs_reply: 0, worth_reading: 1, commercial: 0, possible_scam: 0, none: 0 },
    nouls: {} as DashboardItem["detail"]["nouls"],
    urgencyScore: 0,
    signals: {} as DashboardItem["detail"]["signals"],
    model: "jev",
  },
  ...over,
});

describe("nextIndex (listbox keys)", () => {
  it("moves down and up, clamped at the ends", () => {
    expect(nextIndex("ArrowDown", 0, 3)).toBe(1);
    expect(nextIndex("ArrowDown", 2, 3)).toBe(2);
    expect(nextIndex("ArrowUp", 1, 3)).toBe(0);
    expect(nextIndex("ArrowUp", 0, 3)).toBe(0);
  });
  it("jumps with Home and End", () => {
    expect(nextIndex("Home", 2, 5)).toBe(0);
    expect(nextIndex("End", 0, 5)).toBe(4);
  });
  it("lands on the first item when nothing is selected", () => {
    expect(nextIndex("ArrowDown", -1, 3)).toBe(0);
    expect(nextIndex("ArrowUp", -1, 3)).toBe(0);
  });
  it("ignores other keys and empty lists", () => {
    expect(nextIndex("Enter", 0, 3)).toBeNull();
    expect(nextIndex("a", 0, 3)).toBeNull();
    expect(nextIndex("ArrowDown", -1, 0)).toBeNull();
  });
});

describe("resolveSelection", () => {
  const list = [item(1), item(2)];
  it("keeps the chosen item while it is in the list", () => {
    expect(resolveSelection(list, 2, true)?.id).toBe(2);
    expect(resolveSelection(list, 2, false)?.id).toBe(2);
  });
  it("falls back to the first item only when auto-selecting", () => {
    expect(resolveSelection(list, 9, true)?.id).toBe(1);
    expect(resolveSelection(list, null, false)).toBeNull();
    expect(resolveSelection([], null, true)).toBeNull();
  });
});

describe("neighborId", () => {
  const list = [item(1), item(2), item(3)];
  it("prefers the next item, then the previous one", () => {
    expect(neighborId(list, 2)).toBe(3);
    expect(neighborId(list, 3)).toBe(2);
    expect(neighborId([item(1)], 1)).toBeNull();
    expect(neighborId(list, 42)).toBeNull();
  });
});

describe("groupByCategory", () => {
  it("returns every sidebar category, Others included", () => {
    const g = groupByCategory([]);
    expect(Object.keys(g).sort()).toEqual([...NAV].sort());
  });
  it("sorts by urgency first, then newest", () => {
    const g = groupByCategory([
      item(1, { category: "needs_reply", urgency: 1 }),
      item(2, { category: "needs_reply", urgency: 3 }),
      item(3, { category: "needs_reply", urgency: 1 }),
      item(4, { category: "none" }),
    ]);
    expect(g.needs_reply.map((i) => i.id)).toEqual([2, 3, 1]);
    expect(g.none.map((i) => i.id)).toEqual([4]);
    // Items come back unchanged (no helper fields leak into the UI data).
    expect(g.none[0]).not.toHaveProperty("decision");
  });
});

describe("urgencyLevel", () => {
  it("maps the 0-3 score to the four criteria", () => {
    expect(urgencyLevel(0.2)).toBe("none");
    expect(urgencyLevel(1)).toBe("week");
    expect(urgencyLevel(2.4)).toBe("days");
    expect(urgencyLevel(2.6)).toBe("today");
    expect(urgencyLevel(9)).toBe("today");
    expect(urgencyLevel(Number.NaN)).toBe("none");
  });
});

describe("isTypingTarget", () => {
  it("is true for text fields and editable content", () => {
    expect(isTypingTarget({ tagName: "INPUT", type: "text" })).toBe(true);
    expect(isTypingTarget({ tagName: "input", type: "search" })).toBe(true);
    expect(isTypingTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTypingTarget({ tagName: "SELECT" })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });
  it("is false for sliders, buttons and plain elements", () => {
    expect(isTypingTarget({ tagName: "INPUT", type: "range" })).toBe(false);
    expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
    expect(isTypingTarget({ tagName: "DIV" })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
