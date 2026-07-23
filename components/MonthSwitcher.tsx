"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import { monthLabel } from "@/lib/utils";

export default function MonthSwitcher({
  month,
  onChange,
}: {
  month: Date;
  onChange: (next: Date) => void;
}) {
  const goPrev = () => {
    const d = new Date(month);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    onChange(d);
  };
  const goNext = () => {
    const d = new Date(month);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    onChange(d);
  };

  const isCurrentMonth =
    month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();

  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card px-2 py-2 shadow-card">
      {/* RTL: "next" (forward in time) points left visually */}
      <button
        onClick={goNext}
        disabled={isCurrentMonth}
        aria-label="חודש הבא"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-bold text-ink dark:text-ink-dark">{monthLabel(month)}</span>
      <button
        onClick={goPrev}
        aria-label="חודש קודם"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
