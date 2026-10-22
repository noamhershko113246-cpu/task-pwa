"use client";

import { ListChecks } from "lucide-react";
import { TaskStep } from "@/lib/types";

/** "2/5 שלבים" + a thin bar; `compact` is just the counter, for tight rows. Renders nothing without steps. */
export default function StepProgress({ steps, compact }: { steps?: TaskStep[]; compact?: boolean }) {
  if (!steps || steps.length === 0) return null;
  const done = steps.filter((s) => s.isDone).length;
  const total = steps.length;
  const allDone = done === total;

  if (compact) {
    return (
      <span
        className={`flex shrink-0 items-center gap-0.5 text-[11px] font-medium ${
          allDone ? "text-emerald-700 dark:text-emerald-400" : "text-ink-soft dark:text-ink-dark-soft"
        }`}
      >
        <ListChecks size={12} />
        {done}/{total}
      </span>
    );
  }

  const current = steps.find((s) => !s.isDone);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="min-w-0 truncate text-ink-soft dark:text-ink-dark-soft">
          {allDone ? "כל השלבים הושלמו" : <>שלב נוכחי: <span className="font-semibold text-ink dark:text-ink-dark">{current?.title}</span></>}
        </span>
        <span className={`shrink-0 font-bold ${allDone ? "text-emerald-700 dark:text-emerald-400" : "text-ink-soft dark:text-ink-dark-soft"}`}>
          {done}/{total} שלבים
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
