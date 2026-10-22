"use client";

import { useEffect, useMemo, useState, useId } from "react";
import { AnimatePresence, motion, PanInfo, useDragControls } from "framer-motion";
import { X, Repeat, Plus, ChevronUp, ChevronDown, User } from "lucide-react";
import { useDialog } from "@/lib/useDialog";
import { TeamMember, Task, Priority, PRIORITY_COLORS, MAX_STEPS, MAX_STEP_LENGTH } from "@/lib/types";
import { generateRecurringDates, WEEKDAY_LETTERS, firstName } from "@/lib/utils";
import { useTaskStore } from "@/lib/store";
import { useKeyboardInset } from "@/lib/useKeyboardInset";
import { CategoryPicker } from "./CategoryChips";
import clsx from "clsx";

const PRIORITIES: Priority[] = [1, 2, 3, 4, 5];

export default function CreateTaskSheet({
  open,
  onClose,
  team,
  onCreate,
  initialDate,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  team: TeamMember[];
  /** categoryId: the creator's own category pick (personal — applies to them only), null = none.
   *  steps: ordered step titles, copied onto every created task (empty = no steps). */
  onCreate: (tasks: Omit<Task, "id" | "createdAt" | "status">[], categoryId: string | null, steps: string[]) => void;
  /** Whoever is logged in — whose personal categories are offered. Omit to hide the picker. */
  currentUserId?: string;
  /** "YYYY-MM-DD" — when opened from a specific calendar day, pre-fills the deadline to that
   *  day (09:00) instead of leaving it empty. The date/time stays fully editable either way. */
  initialDate?: string;
}) {
  const keyboard = useKeyboardInset(open);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState("");

  const addStep = () => {
    const title = newStep.trim();
    if (!title || steps.length >= MAX_STEPS) return;
    setSteps((prev) => [...prev, title]);
    setNewStep("");
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const { categories } = useTaskStore();
  const myCategories = currentUserId ? categories.filter((c) => c.userId === currentUserId) : [];
  const dragControls = useDragControls();

  useEffect(() => {
    if (open && initialDate) setDeadline(`${initialDate}T09:00`);
  }, [open, initialDate]);

  const assignable = team;
  // "לעצמי בלבד": one tap to assign only to whoever is creating the task (instead of hunting for
  // your own first name among everyone). Hidden when the creator isn't a pickable assignee here,
  // e.g. when a manager opens a task sheet from someone else's page.
  const myMember = currentUserId ? assignable.find((m) => m.id === currentUserId) : undefined;
  const onlyMe = !!myMember && assigneeIds.size === 1 && assigneeIds.has(myMember.id);

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
    setCategoryId(null);
    setSteps([]);
    setNewStep("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };
  const dialogRef = useDialog<HTMLDivElement>(open, handleClose);
  const titleId = useId();

  const handleSubmit = () => {
    if (!title.trim() || assigneeIds.size === 0) return;
    if (isRecurring && !deadline) return;

    const base = { title: title.trim(), description: description.trim(), assigneeIds: Array.from(assigneeIds), priority };
    // A step typed but never "added" still counts — it's obviously meant to be included.
    const finalSteps = newStep.trim() && steps.length < MAX_STEPS ? [...steps, newStep.trim()] : steps;

    if (isRecurring) {
      if (recurringDates.length === 0) return;
      // tasks.recurrence_id is a real `uuid` column in Postgres — it must be a valid
      // UUID or every insert in the batch is rejected.
      const recurrenceId = crypto.randomUUID();
      onCreate(recurringDates.map((d) => ({ ...base, deadline: d, recurrenceId })), categoryId, finalSteps);
    } else {
      onCreate([{ ...base, deadline: deadline ? new Date(deadline).toISOString() : null }], categoryId, finalSteps);
    }
    handleClose();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) handleClose();
  };

  const canSubmit = Boolean(
    title.trim() && assigneeIds.size > 0 && (!isRecurring || (deadline && selectedDays.size > 0 && recurrenceEnd))
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
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            style={keyboard ? { bottom: keyboard, maxHeight: `calc(88dvh - ${keyboard}px)` } : undefined}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="sheet-scroll fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-white dark:bg-surface-dark-card px-5 pb-sheet pt-3 shadow-2xl md:bottom-6 md:mx-auto md:max-w-lg md:rounded-3xl"
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex cursor-grab justify-center pb-3 active:cursor-grabbing"
            >
              <div className="bottom-sheet-handle" />
            </div>

            <div className="flex items-center justify-between mb-5">
              <h2 id={titleId} className="text-lg font-extrabold text-ink dark:text-ink-dark">משימה חדשה</h2>
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
                <label htmlFor="ct-f1" className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                  שם המשימה
                </label>
                <input id="ct-f1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="למשל: עדכון דו״ח שבועי"
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="ct-f2" className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                  תיאור
                </label>
                <textarea id="ct-f2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="פרטים נוספים על המשימה..."
                  className="w-full resize-none rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink dark:text-ink-dark">
                  שיוך מהיר — אפשר לבחור כמה אנשים
                </label>
                {myMember && (
                  <button
                    type="button"
                    onClick={() => setAssigneeIds(onlyMe ? new Set() : new Set([myMember.id]))}
                    aria-pressed={onlyMe}
                    className={clsx(
                      "mb-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition-colors",
                      onlyMe
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "border-zinc-200 dark:border-zinc-700 text-ink dark:text-ink-dark"
                    )}
                  >
                    <User size={16} />
                    לעצמי בלבד
                  </button>
                )}
                <div className="flex flex-wrap gap-3">
                  {assignable.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleAssignee(m.id)}
                      className={clsx(
                        "flex h-12 min-w-[3.5rem] items-center justify-center rounded-full bg-gradient-avatar px-3.5 font-bold text-white text-sm transition-all active:scale-90",
                        m.colorFrom,
                        m.colorTo,
                        assigneeIds.has(m.id)
                          ? "ring-4 ring-offset-2 ring-brand-400 dark:ring-offset-surface-dark-card scale-105"
                          : "saturate-50 hover:saturate-100"
                      )}
                      aria-pressed={assigneeIds.has(m.id)}
                    >
                      {firstName(m.name)}
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
                <label htmlFor="ct-deadline" className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                  {isRecurring ? "מתחיל בתאריך ושעה" : "דדליין (תאריך ושעה) — לא חובה"}
                </label>
                <div className="relative">
                  <input
                    id="ct-deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                      } catch {
                        // showPicker isn't supported everywhere — clicking the native icon still works
                      }
                    }}
                    className="w-full cursor-pointer rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                  />
                  {deadline && !isRecurring && (
                    <button
                      type="button"
                      onClick={() => setDeadline("")}
                      aria-label="הסרת דדליין"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {!isRecurring && !deadline && (
                  <p className="mt-1.5 text-xs text-ink-soft dark:text-ink-dark-soft">
                    אפשר להשאיר ריק אם אין דדליין קבוע
                  </p>
                )}
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
                          priority === p ? "ring-2 ring-offset-1 ring-brand-400 dark:ring-offset-surface-dark-card" : "saturate-50"
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

              <div>
                <label className="mb-1 block text-sm font-semibold text-ink dark:text-ink-dark">
                  שלבים <span className="font-normal text-ink-soft dark:text-ink-dark-soft">(לא חובה)</span>
                </label>
                <p className="mb-2 text-xs text-ink-soft dark:text-ink-dark-soft">
                  השלבים יבוצעו לפי הסדר — כל שלב נפתח רק אחרי שהקודם הושלם.
                </p>
                {steps.length > 0 && (
                  <ol className="mb-2 space-y-1.5">
                    {steps.map((s, i) => (
                      <li
                        key={`${i}-${s}`}
                        className="flex items-center gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-ink dark:text-ink-dark"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-[11px] font-bold text-brand-700 dark:text-brand-300">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{s}</span>
                        <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="הזזה למעלה" className="p-0.5 text-ink-soft disabled:opacity-25">
                          <ChevronUp size={15} />
                        </button>
                        <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} aria-label="הזזה למטה" className="p-0.5 text-ink-soft disabled:opacity-25">
                          <ChevronDown size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSteps((prev) => prev.filter((_, j) => j !== i))}
                          aria-label="מחיקת השלב"
                          className="p-0.5 text-rose-500"
                        >
                          <X size={15} />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                {steps.length < MAX_STEPS ? (
                  <div className="flex gap-2">
                    <input
                      value={newStep}
                      maxLength={MAX_STEP_LENGTH}
                      onChange={(e) => setNewStep(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addStep();
                        }
                      }}
                      placeholder={steps.length === 0 ? "שלב ראשון..." : `שלב ${steps.length + 1}...`}
                      aria-label="הוספת שלב למשימה"
                      className="min-w-0 flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-2.5 text-sm text-ink dark:text-ink-dark outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={addStep}
                      disabled={!newStep.trim()}
                      className="flex shrink-0 items-center gap-1 rounded-2xl bg-brand-600 px-3.5 text-xs font-bold text-white disabled:opacity-40"
                    >
                      <Plus size={14} />
                      הוספה
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-ink-soft dark:text-ink-dark-soft">הגעת למקסימום של {MAX_STEPS} שלבים.</p>
                )}
              </div>

              {currentUserId && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink dark:text-ink-dark">קטגוריה</label>
                  {myCategories.length > 0 ? (
                    <CategoryPicker categories={myCategories} value={categoryId} onChange={setCategoryId} />
                  ) : (
                    <p className="text-xs text-ink-soft dark:text-ink-dark-soft">
                      עדיין אין לך קטגוריות — אפשר להוסיף בהגדרות ← &quot;הקטגוריות שלי&quot;
                    </p>
                  )}
                </div>
              )}

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
                                  "flex aspect-square max-w-10 flex-1 items-center justify-center rounded-full text-sm font-bold transition-all active:scale-90",
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
                          <label htmlFor="ct-f3" className="mb-1.5 block text-xs font-semibold text-ink-soft dark:text-ink-dark-soft">
                            חוזר עד תאריך
                          </label>
                          <input id="ct-f3"
                            type="date"
                            value={recurrenceEnd}
                            min={deadline ? deadline.slice(0, 10) : undefined}
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
