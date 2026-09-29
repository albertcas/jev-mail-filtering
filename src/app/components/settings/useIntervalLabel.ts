"use client";

import { useTranslations } from "next-intl";
import { intervalUnit } from "./intervals";

/** "15 minutes", "2 hours"… in the current language, for the sync-frequency selects. */
export function useIntervalLabel(): (minutes: number) => string {
  const t = useTranslations("settings");
  return (minutes) => {
    const u = intervalUnit(minutes);
    return t(u.unit, { count: u.count });
  };
}
