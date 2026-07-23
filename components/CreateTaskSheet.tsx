"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { X, Calendar, Repeat } from "lucide-react";
import { TeamMember, Task, Priority, PRIORITY_COLORS } from "@/lib/types";
import { generateRecurringDates, WEEKDAY_LETTERS } from "@/lib/utils";
import clsx from "clsx";

const PRIORITIES: Priority[] = [1, 2, 3, 4, 5];

export default function CreateTaskSheet({
  open,
  onClose,
  team,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  team: TeamMember[];
  onCreate: (tasks: Omit<Task, "id" | "createdAt" | "status">[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [priority, setPriority] = useState<Priority>(3);

  const assignable = team;

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const recurringDates = useMemo(
    () => (isRecurring && deadline && recurrenceEnd ? generateRecurringDates(deadline, recurrenceEnd, selectedDays) : []),
    [isRecurring, deadline, recurrenceEnd, selectedDays]
  );

  const reset = () => {
    setTitle("");
    setDescription("");
    setAssigneeIds(new Set());
    setDeadline("");
    setIsRecurring(false);
    setSelectedDays(new Set());
    setRecurrenceEnd("");
    setPriority(3);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim() || assigneeIds.size === 0 || !deadline) return;

    const base = { title: title.trim(), description: description.trim(), assigneeIds: Array.from(assigneeIds), priority };

    if (isRecurring) {
      if (recurringDates.length === 0) return;
      const recurrenceId = `rec${Date.now()}`;
      onCreate(recurringDates.map((d) => ({ ...base, deadline: d, recurrenceId })));
    } else {
      onCreate([{ ...base, deadline }]);
    }
    handleClose();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) handleClose();
  };

  const canSubmit = Boolean(
    title.trim() && assigneeIds.size > 0 && deadline && (!isRecurring || (selectedDays.size > 0 && recurrenceEnd))
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-surface-dark-card px-5 pb-8 pt-3 shadow-2xl"
          >
            <div className="flex justify-center pb-3">
              <div className="bottom-sheet-handle" />
            </div>

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold text-ink dark:text-ink-dark">משימה חדשה</h2>
              <button
                onClick={handleClose}
                aria-label="סגירה"
                className="rounded-full p-1.5 text-ink-soft hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                  שם המשימה
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="למשל: עדכון דו״ח שבועי"
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                  תיאור
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="פרטים נוספים על המשימה..."
                  className="w-full resize-none rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink dark:text-ink-dark">
                  שיוך מהיר — אפשר לבחור כמה אנשים
                </label>
                <div className="flex flex-wrap gap-3">
                  {assignable.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleAssignee(m.id)}
                      className={clsx(
                        "flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white text-sm transition-all active:scale-90",
                        m.colorFrom,
                        m.colorTo,
                        assigneeIds.has(m.id)
                          ? "ring-4 ring-offset-2 ring-brand-400 dark:ring-offset-surface-dark-card scale-105"
                          : "opacity-60 hover:opacity-100"
                      )}
                      aria-pressed={assigneeIds.has(m.id)}
                    >
                      {m.initials}
                    </button>
                  ))}
                </div>
                {assigneeIds.size > 0 && (
                  <p className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-300">
                    {assigneeIds.size === 1
                      ? "נבחר/ה אדם אחד/ת"
                      : `נבחרו ${assigneeIds.size} אנשים — המשימה תהיה משותפת לכולם`}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                  {isRecurring ? "מתחיל בתאריך" : "דדליין"}
                </label>
                <div className="relative">
                  <Calendar
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 py-3 pr-11 pl-4 text-ink dark:text-ink-dark focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink dark:text-ink-dark">
                  רמת דחיפות
                </label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => {
                    const c = PRIORITY_COLORS[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={clsx(
                          "flex-1 rounded-xl py-2.5 text-center text-xs font-bold transition-all active:scale-95",
                          priority === p ? "ring-2 ring-offset-1 ring-brand-400 dark:ring-offset-surface-dark-card" : "opacity-70"
                        )}
                        style={{ backgroundColor: c.bg, color: c.fg }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-center text-xs text-ink-soft dark:text-ink-dark-soft">
                  {PRIORITY_COLORS[priority].label} · 1 הכי דחוף, 5 הכי פחות
                </p>
              </div>

              {/* Recurring task toggle — like Google Calendar's custom weekly repeat */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-4">
                <button
                  onClick={() => setIsRecurring((v) => !v)}
                  className="flex w-full items-center justify-between"
                  aria-pressed={isRecurring}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-ink-dark">
                    <Repeat size={16} />
                    משימה חוזרת
                  </span>
                  <span
                    className={clsx(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      isRecurring ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-600"
                    )}
                  >
                    <motion.span
                      layout
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                      style={{ right: isRecurring ? 2 : 22 }}
                    />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isRecurring && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                        <div>
                          <p className="mb-2 text-xs font-semibold text-ink-soft dark:text-ink-dark-soft">
                            באילו ימים בשבוע?
                          </p>
                          <div className="flex justify-between gap-1.5">
                            {WEEKDAY_LETTERS.map((letter, day) => (
                              <button
                                key={day}
                                onClick={() => toggleDay(day)}
                                aria-pressed={selectedDays.has(day)}
                                className={clsx(
                                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all active:scale-90",
                                  selectedDays.has(day)
                                    ? "bg-brand-600 text-white"
                                    : "bg-white dark:bg-zinc-700 text-ink-soft dark:text-ink-dark-soft border border-zinc-200 dark:border-zinc-600"
                                )}
                              >
                                {letter}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-ink-soft dark:text-ink-dark-soft">
                            חוזר עד תאריך
                          </label>
                          <input
                            type="date"
                            value={recurrenceEnd}
                            min={deadline || undefined}
                            onChange={(e) => setRecurrenceEnd(e.target.value)}
                            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2.5 text-ink dark:text-ink-dark outline-none focus:border-brand-500 transition-colors"
                          />
                        </div>

                        {recurringDates.length > 0 && (
                          <p className="text-xs font-medium text-brand-600 dark:text-brand-300">
                            תיווצרנה {recurringDates.length} משימות, לפי הימים שנבחרו
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={clsx(
                  "w-full rounded-2xl py-3.5 font-bold text-white transition-all active:scale-[0.98]",
                  canSubmit
                    ? "bg-brand-600 hover:bg-brand-700 shadow-soft"
                    : "bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed"
                )}
              >
                {isRecurring && recurringDates.length > 0
                  ? `יצירת ${recurringDates.length} משימות`
                  : "יצירת משימה"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
