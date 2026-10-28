"use client";

import clsx from "clsx";
import { deadlineShortcuts } from "@/lib/deadlineShortcuts";

/** Quick deadline chips under a deadline field: היום · מחר · סוף השבוע · בעוד שבוע. */
export default function DeadlineShortcuts({ value, onPick }: { value: string; onPick: (value: string) => void }) {
  const options = deadlineShortcuts();
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="דדליין מהיר">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => onPick(o.value)}
            aria-pressed={active}
            className={clsx(
              "press min-h-9 rounded-full px-3.5 text-xs font-bold transition-colors",
              active
                ? "bg-brand-600 text-white"
                : "bg-zinc-100 text-ink-soft dark:bg-zinc-800 dark:text-ink-dark-soft"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
