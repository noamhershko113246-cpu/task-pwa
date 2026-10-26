"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, FileText, Flag, Tag, X, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Priority, PRIORITY_COLORS, Task } from "@/lib/types";
import { useTaskStore } from "@/lib/store";
import { useDialog } from "@/lib/useDialog";
import { DURATION, SHEET_SPRING } from "@/lib/motion";
import { CategoryBadge, CategoryPicker } from "./CategoryChips";

export interface TaskActionMenuConfig {
  /** Who is doing this (the logged-in person) — recorded as the actor of the edit. */
  actorId: string;
  /** Whose categories the "assign to category" option files the task under. null hides the option —
   *  used on someone else's page, where the categories on screen belong to them, not to the viewer. */
  categoryOwnerId: string | null;
}

type View = "main" | "category" | "priority";

/**
 * The menu that opens on a long-press (or right-click) of a task: open it, file it under one of your
 * categories, change its priority, mark it done. Deliberately NOT here: delete — a long press is easy
 * to trigger by accident, so deleting stays inside the task's own sheet with its confirmation step.
 *
 * Rendered through a portal: a task card moves with the finger (it carries a transform), and a
 * `position: fixed` child of a transformed element is positioned against that element, not the screen.
 */
export default function TaskActionMenu({
  task,
  open,
  onClose,
  config,
  onOpenDetail,
  onComplete,
}: {
  task: Task;
  open: boolean;
  onClose: () => void;
  config: TaskActionMenuConfig;
  onOpenDetail?: (task: Task) => void;
  /** Provided only where completing from here makes sense (it runs that screen's own confetti + undo). */
  onComplete?: (taskId: string) => void;
}) {
  const { categories, getTaskCategory, setTaskCategory, updateTask } = useTaskStore();
  const [view, setView] = useState<View>("main");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const titleId = useId();
  const dialogRef = useDialog<HTMLDivElement>(open, onClose);

  // Always reopen on the main list, never on whichever sub-view was left open last time.
  useEffect(() => {
    if (open) setView("main");
  }, [open]);

  const { categoryOwnerId, actorId } = config;
  const ownerCategories = categoryOwnerId ? categories.filter((c) => c.userId === categoryOwnerId) : [];
  const currentCategory = categoryOwnerId ? getTaskCategory(task.id, categoryOwnerId) : undefined;
  const priority = PRIORITY_COLORS[task.priority];

  const row = "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start text-sm font-bold text-ink transition-colors active:bg-zinc-100 dark:text-ink-dark dark:active:bg-zinc-800";
  const iconWrap = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-ink-soft dark:bg-zinc-800 dark:text-ink-dark-soft";

  const renderRow = (key: string, { icon: Icon, label, onClick, trailing }: { icon: LucideIcon; label: string; onClick: () => void; trailing?: React.ReactNode }) => (
    <button key={key} type="button" onClick={onClick} className={row}>
      <span className={iconWrap}>
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );

  const renderSubHeader = (label: string) => (
    <div className="mb-2 flex items-center gap-1 px-1">
      <button
        type="button"
        autoFocus
        onClick={() => setView("main")}
        aria-label="חזרה לתפריט"
        className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <ChevronRight size={18} />
      </button>
      <h3 className="text-sm font-extrabold text-ink dark:text-ink-dark">{label}</h3>
    </div>
  );

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.base }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            key="sheet"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SHEET_SPRING}
            className="sheet-scroll fixed inset-x-0 bottom-0 z-[70] max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white px-4 pb-sheet pt-3 shadow-2xl dark:bg-surface-dark-card md:bottom-6 md:mx-auto md:max-w-sm md:rounded-3xl"
          >
            <div className="flex justify-center pb-2">
              <div className="h-1.5 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>

            {view === "main" && (
              <>
                <div className="mb-1 flex items-center justify-between gap-2 px-1">
                  <h2 id={titleId} className="min-w-0 truncate text-base font-extrabold text-ink dark:text-ink-dark">
                    {task.title}
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="סגור"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {onOpenDetail &&
                    renderRow("open", {
                      icon: FileText,
                      label: "פתיחת פרטים",
                      onClick: () => {
                        onClose();
                        onOpenDetail(task);
                      },
                    })}
                  {categoryOwnerId &&
                    renderRow("category", {
                      icon: Tag,
                      label: "שיוך לקטגוריה",
                      onClick: () => setView("category"),
                      trailing: (
                        <>
                          {currentCategory && <CategoryBadge category={currentCategory} />}
                          <ChevronLeft size={16} className="shrink-0 text-ink-soft" />
                        </>
                      ),
                    })}
                  {renderRow("priority", {
                    icon: Flag,
                    label: "שינוי דחיפות",
                    onClick: () => setView("priority"),
                    trailing: (
                      <>
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: priority.bg, color: priority.fg }}>
                          {priority.label}
                        </span>
                        <ChevronLeft size={16} className="shrink-0 text-ink-soft" />
                      </>
                    ),
                  })}
                  {onComplete &&
                    task.status !== "done" &&
                    task.status !== "cancelled" &&
                    renderRow("complete", {
                      icon: Check,
                      label: "סימון כהושלמה",
                      onClick: () => {
                        onClose();
                        onComplete(task.id);
                      },
                    })}
                </div>
              </>
            )}

            {view === "category" && (
              <>
                <h2 id={titleId} className="sr-only">שיוך לקטגוריה</h2>
                {renderSubHeader("שיוך לקטגוריה")}
                <div className="px-1 pb-2">
                  {ownerCategories.length === 0 ? (
                    <p className="py-3 text-sm text-ink-soft dark:text-ink-dark-soft">
                      עדיין אין לך קטגוריות. אפשר ליצור אותן בהגדרות.
                    </p>
                  ) : (
                    <CategoryPicker
                      categories={ownerCategories}
                      value={currentCategory?.id ?? null}
                      onChange={(categoryId) => {
                        if (categoryOwnerId && categoryId !== (currentCategory?.id ?? null)) {
                          setTaskCategory(task.id, categoryOwnerId, categoryId);
                        }
                        onClose();
                      }}
                    />
                  )}
                </div>
              </>
            )}

            {view === "priority" && (
              <>
                <h2 id={titleId} className="sr-only">שינוי דחיפות</h2>
                {renderSubHeader("שינוי דחיפות")}
                <div className="flex flex-wrap gap-2 px-1 pb-2">
                  {([1, 2, 3, 4, 5] as Priority[]).map((p) => {
                    const c = PRIORITY_COLORS[p];
                    const active = task.priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          if (!active) updateTask(task.id, { priority: p }, actorId);
                          onClose();
                        }}
                        className={clsx(
                          "rounded-full px-3.5 py-2 text-xs font-bold transition-all active:scale-95",
                          active ? "ring-2 ring-offset-1 ring-brand-400 dark:ring-offset-surface-dark-card" : "saturate-50"
                        )}
                        style={{ backgroundColor: c.bg, color: c.fg }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // `document` doesn't exist while rendering on the server, so the portal is created only after mount.
  if (!mounted) return null;
  return createPortal(content, document.body);
}
