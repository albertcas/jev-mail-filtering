"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * After a failed submit, moves focus to the first control marked aria-invalid
 * inside the container, once React has rendered the error (so its
 * aria-describedby already points at the message and is read on focus).
 */
export function useFocusFirstInvalid<T extends HTMLElement>(): [RefObject<T | null>, () => void] {
  const ref = useRef<T>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (tick === 0) return;
    ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [tick]);
  return [ref, () => setTick((n) => n + 1)];
}
