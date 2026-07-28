"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { X, Wand2, AlertTriangle, Target, Sparkles } from "lucide-react";
import { Task, TeamMember, PRIORITY_COLORS } from "@/lib/types";
import { formatDeadline } from "@/lib/utils";
import { analyzeTasks } from "@/lib/insights";

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export default function AITriageSheet({
  open,
  tasks,
  team,
  onClose,
  onOpenDetail,
}: {
  open: boolean;
  tasks: Task[];
  team?: TeamMember[];
  onClose: () => void;
  onOpenDetail?: (task: Task) => void;
}) {
  const [analyzing, setAnalyzing] = useState(true);

  // A short, fake "thinking" beat makes the local analysis read as an actual scan rather than an instant lookup.
  useEffect(() => {
    if (!open) return;
    setAnalyzing(true);
    const timer = setTimeout(() => setAnalyzing(false), 700);
    return () => clearTimeout(timer);
  }, [open]);

  const result = analyzeTasks(tasks);
  const findName = (id?: string) => (id ? team?.find((m) => m.id === id)?.name : undefined);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-surface-dark-card px-5 pb-8 pt-3 shadow-2xl md:bottom-6 md:mx-auto md:max-w-lg md:rounded-3xl"
          >
            <div className="flex justify-center pb-3">
              <div className="h-1.5 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-brand-600 text-white shadow-soft">
                  <Wand2 size={18} />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-ink dark:text-ink-dark">טריאז׳ חכם</h2>
                  <p className="text-xs text-ink-soft dark:text-ink-dark-soft">עוזר לסדר עדיפויות ולזהות תקיעות</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-ink-soft hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="סגור"
              >
                <X size={18} />
              </button>
            </div>

            {analyzing ? (
              <div className="flex flex-col items-center gap-3 py-14">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-500"
                >
                  <Sparkles size={22} />
                </motion.div>
                <p className="text-sm font-medium text-ink-soft dark:text-ink-dark-soft">סורק/ת את המשימות שלך...</p>
              </div>
            ) : (
              <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-5">
                <motion.p
                  variants={itemVariants}
                  className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-700 dark:text-violet-300"
                >
                  {result.headline}
                </motion.p>

                {result.bottlenecks.length > 0 && (
                  <motion.section variants={itemVariants}>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink dark:text-ink-dark">
                      <AlertTriangle size={15} className="text-amber-500" />
                      צווארי בקבוק
                    </p>
                    <div className="space-y-2">
                      {result.bottlenecks.map(({ task, reason }) => (
                        <button
                          key={task.id}
                          onClick={() => onOpenDetail?.(task)}
                          className="w-full rounded-2xl border border-amber-100 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-3 text-right transition-transform active:scale-[0.98]"
                        >
                          <p className="truncate text-sm font-semibold text-ink dark:text-ink-dark">{task.title}</p>
                          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{reason}</p>
                        </button>
                      ))}
                    </div>
                  </motion.section>
                )}

                <motion.section variants={itemVariants}>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink dark:text-ink-dark">
                    <Target size={15} className="text-brand-600" />
                    3 העדיפויות המובילות להיום
                  </p>
                  {result.topPriorities.length === 0 ? (
                    <p className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-4 text-center text-sm text-ink-soft dark:text-ink-dark-soft">
                      אין משימות פתוחות כרגע ✨
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {result.topPriorities.map((task, i) => {
                        const assigneeName = findName(task.assigneeIds[0]);
                        return (
                          <button
                            key={task.id}
                            onClick={() => onOpenDetail?.(task)}
                            className="flex w-full items-center gap-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-3 text-right shadow-card transition-transform active:scale-[0.98]"
                          >
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                              style={{ backgroundColor: PRIORITY_COLORS[task.priority].fg }}
                            >
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink dark:text-ink-dark">{task.title}</p>
                              <p className="text-xs text-ink-soft dark:text-ink-dark-soft">
                                {assigneeName ? `${assigneeName} · ` : ""}
                                {formatDeadline(task.deadline)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.section>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
