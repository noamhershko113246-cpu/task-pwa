import { Priority, PRIORITY_COLORS } from "@/lib/types";
import clsx from "clsx";

/** Neutral look for the everyday priorities, so color only ever means "urgent". */
const QUIET = { bg: "#f4f4f5", fg: "#71717a" };

/**
 * Colors for a priority in lists: only 1–2 (דחוף מאוד / דחוף) keep their color; 3–5 are gray.
 * With every priority in its own color, a list of many tasks became a wall of competing colors.
 */
export function listPriorityColors(priority: Priority): { bg: string; fg: string } {
  return priority <= 2 ? PRIORITY_COLORS[priority] : QUIET;
}

/** The same quiet scheme as classes for chips/pills, with dark-mode variants (an inline light
 *  background stayed a bright patch on the dark theme). `active` is a selected filter chip. */
export function priorityChipClass(priority: Priority, active = false): string {
  if (priority === 1)
    return active ? "bg-rose-700 text-white" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
  if (priority === 2)
    return active ? "bg-orange-700 text-white" : "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";
  return active ? "bg-zinc-600 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

export default function PriorityBadge({
  priority,
  variant = "pill",
  className,
}: {
  priority: Priority;
  variant?: "pill" | "dot";
  className?: string;
}) {
  const title = `עדיפות ${priority} — ${PRIORITY_COLORS[priority].label}`;

  if (variant === "dot") {
    return (
      <span
        className={clsx("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
        style={{ backgroundColor: listPriorityColors(priority).fg }}
        title={title}
      />
    );
  }

  return (
    <span
      className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", priorityChipClass(priority), className)}
      title={title}
    >
      {priority <= 2 ? PRIORITY_COLORS[priority].label : `עדיפות ${priority}`}
    </span>
  );
}
