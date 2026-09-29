import {
  ArrowBendUpLeftIcon,
  BookOpenTextIcon,
  QuestionIcon,
  ShieldWarningIcon,
  TagIcon,
  TrayIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "../ui";
import { categoryMark } from "../ui/tones";
import { toneOf, type ColumnId } from "./format";

const ICONS: Record<ColumnId, Icon> = {
  needs_reply: ArrowBendUpLeftIcon,
  worth_reading: BookOpenTextIcon,
  commercial: TagIcon,
  possible_scam: ShieldWarningIcon,
  unsure: QuestionIcon,
  none: TrayIcon,
};

/** Category glyph on the dark sidebar (fixed, measured sidebar marks). */
export const sidebarMark: Record<ColumnId, string> = {
  needs_reply: "text-sidebar-cat-needs-reply",
  worth_reading: "text-sidebar-cat-worth-reading",
  commercial: "text-sidebar-cat-commercial",
  possible_scam: "text-sidebar-cat-possible-scam",
  unsure: "text-sidebar-cat-unsure",
  none: "text-sidebar-cat-none",
};

/** Category glyph on light/dark surfaces (the category's mark color). */
export const surfaceMark: Record<ColumnId, string> = {
  needs_reply: "text-cat-needs-reply",
  worth_reading: "text-cat-worth-reading",
  commercial: "text-cat-commercial",
  possible_scam: "text-cat-possible-scam",
  unsure: "text-cat-unsure",
  none: "text-cat-none",
};

/**
 * Each category has its own drawn icon, so identity never rests on color:
 * the sidebar, the icon rail and the phone selector all read without it.
 * Decorative: the category name is always in the accessible name next to it.
 */
export function CategoryIcon({ category, size = 18, className }: { category: ColumnId; size?: number; className?: string }) {
  const Glyph = ICONS[category];
  const fill = category === "possible_scam";
  return <Glyph aria-hidden size={size} weight={fill ? "fill" : "bold"} className={cn("shrink-0", className)} />;
}

/** Small identity mark inside text (badges, move targets): a dot, or the shield for Possible scam. */
export function CategoryMark({ category, className }: { category: ColumnId; className?: string }) {
  return category === "possible_scam" ? (
    <ShieldWarningIcon aria-hidden size={15} weight="fill" className={cn("shrink-0 text-cat-possible-scam", className)} />
  ) : (
    <span aria-hidden className={cn("size-2 shrink-0 rounded-full", categoryMark[toneOf[category]], className)} />
  );
}
