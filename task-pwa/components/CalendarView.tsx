"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Task, TeamMember, PRIORITY_COLORS } from "@/lib/types";
import { monthLabel, localDateKey } from "@/lib/utils";
import HistoryTaskRow from "./HistoryTaskRow";

const WEEKDAY_HEADERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarView({
  tasks,
  team,
  onOpenTask,
}: {
  tasks: Task[];
  team: TeamMember[];
  onOpenTask: (task: Task) => void;
}) {
  const [month, setMonth] = useState(new Date());
  const todayKey = toDateKey(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.deadline) continue;
      const key = localDateKey(t.deadline);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const monthIdx = month.getMonth();
    const firstOfMonth = new Date(year, monthIdx, 1);
    // Hebrew week starts Sunday (getDay() 0) — back up to the Sunday on/before the 1st
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(year, monthIdx, 1 - startOffset);

    const result: { date: Date; inMonth: boolean; key: string }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      result.push({ date: d, inMonth: d.getMonth() === monthIdx, key: toDateKey(d) });
    }
    return result;
  }, [month]);

  const goPrev = () => {
    const d = new Date(month);
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    setMonth(d);
  };
  const goNext = () => {
    const d = new Date(month);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    setMonth(d);
  };

  const selectedTasks = tasksByDay.get(selectedDay) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card px-2 py-2 shadow-card">
        <button
          onClick={goNext}
          aria-label="חודש הבא"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold text-ink dark:text-ink-dark">{monthLabel(month)}</span>
        <button
          onClick={goPrev}
          aria-label="חודש קודם"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-3 shadow-card">
        <div className="mb-2 grid grid-cols-7 text-center">
          {WEEKDAY_HEADERS.map((d) => (
            <span key={d} className="text-[11px] font-bold text-ink-soft dark:text-ink-dark-soft">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map(({ date, inMonth, key }) => {
            const dayTasks = tasksByDay.get(key) ?? [];
            const isSelected = key === selectedDay;
            const isToday = key === todayKey;
            const topPriorities = dayTasks
              .map((t) => t.priority)
              .sort((a, b) => a - b)
              .slice(0, 3);

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-xs transition-colors ${
                  isSelected
                    ? "bg-brand-600 text-white font-bold"
                    : isToday
                    ? "bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 font-bold"
                    : inMonth
                    ? "text-ink dark:text-ink-dark hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    : "text-zinc-300 dark:text-zinc-700"
                }`}
              >
                <span>{date.getDate()}</span>
                {topPriorities.length > 0 && (
                  <span className="flex gap-0.5">
                    {topPriorities.map((p, i) => (
                      <span
                        key={i}
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: isSelected ? "#fff" : PRIORITY_COLORS[p].fg }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-soft dark:text-ink-dark-soft">
          {selectedTasks.length === 0 ? "אין משימות ביום הזה" : `משימות ליום זה (${selectedTasks.length})`}
        </p>
        <div className="space-y-2">
          {selectedTasks.map((task) => (
            <HistoryTaskRow
              key={task.id}
              task={task}
              assignees={team.filter((m) => task.assigneeIds.includes(m.id))}
              onClick={onOpenTask}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
