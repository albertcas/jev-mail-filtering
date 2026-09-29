"use client";

import { useEffect, useRef, useState } from "react";
import type { Thresholds } from "@/core/policy/thresholds";

export const THRESHOLD_KEYS = ["scam", "minConfidence", "strongNoul"] as const;
export type ThresholdKey = (typeof THRESHOLD_KEYS)[number];
const DEBOUNCE_MS = 150;

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Slider state shared by the dashboard's Adjust popover and Settings: a local
 * draft so the thumb follows the pointer instantly, reported to the parent
 * debounced (150 ms) so the board recomputes while dragging without calling
 * Jev again, plus an explicit Save that persists it.
 */
export function useThresholdDraft(value: Thresholds, onChange: (t: Thresholds) => void, onSave: (t: Thresholds) => Promise<unknown>) {
  const [draft, setDraft] = useState(value);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const update = (key: ThresholdKey, v: number) => {
    const next = { ...draft, [key]: Math.round(v * 100) / 100 };
    setDraft(next);
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeRef.current(next), DEBOUNCE_MS);
  };

  const save = async () => {
    setSaveState("saving");
    try {
      await onSave(draft);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return { draft, update, save, saveState };
}
