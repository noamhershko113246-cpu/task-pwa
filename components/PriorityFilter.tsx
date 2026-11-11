"use client";

import { Priority, PRIORITY_COLORS } from "@/lib/types";
import clsx from "clsx";
import { priorityChipClass } from "./PriorityBadge";

const PRIORITIES: Priority[] = [1, 2, 3, 4, 5];

export default function PriorityFilter({
  selected,
  onChange,
}: {
  selected: Set<Priority>;
  onChange: (next: Set<Priority>) => void;
}) {
  const toggle = (p: Priority) => {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    onChange(next);
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      <button
        onClick={() => onChange(new Set())}
        className={clsx(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
          selected.size === 0
            ? "bg-brand-600 text-white"
            : "bg-zinc-100 dark:bg-zinc-800 text-ink-soft dark:text-ink-dark-soft"
        )}
      >
        הכל
      </button>
      {PRIORITIES.map((p) => {
        const active = selected.has(p);
        return (
          <button
            key={p}
            onClick={() => toggle(p)}
            aria-pressed={active}
            aria-label={`עדיפות ${p} — ${PRIORITY_COLORS[p].label}`}
            title={PRIORITY_COLORS[p].label}
            className={clsx(
              "min-w-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
              priorityChipClass(p, active),
              selected.size > 0 && !active && "opacity-50"
            )}
          >
            {p <= 2 ? PRIORITY_COLORS[p].label : p}
          </button>
        );
      })}
    </div>
  );
}
