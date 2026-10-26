"use client";

import { useEffect, useRef, useState } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Check, Calendar, AlertCircle, Paperclip } from "lucide-react";
import { Task, Category } from "@/lib/types";
import { formatDeadline, formatCreatedAt, isOverdue } from "@/lib/utils";
import { useConfetti } from "@/hooks/useConfetti";
import PriorityBadge from "./PriorityBadge";
import { CategoryBadge } from "./CategoryChips";
import StepProgress from "./StepProgress";
import clsx from "clsx";
import { DURATION, EASE } from "@/lib/motion";
import { useLongPress } from "@/lib/useLongPress";
import TaskActionMenu, { TaskActionMenuConfig } from "./TaskActionMenu";

const SWIPE_THRESHOLD = 110;

export default function TaskCard({
  task,
  creatorName,
  category,
  onComplete,
  onOpenDetail,
  menu,
}: {
  task: Task;
  creatorName?: string;
  category?: Category; // the viewer's own category for this task

  onComplete: (taskId: string) => void;
  onOpenDetail?: (task: Task) => void;
  /** Turns on the long-press / right-click menu (open, category, priority, complete). */
  menu?: TaskActionMenuConfig;
}) {
  const [completing, setCompleting] = useState(false);
  // After the card has slid away, the space it took collapses — then the task is actually marked done.
  const [collapsing, setCollapsing] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const [menuOpen, setMenuOpen] = useState(false);
  const longPress = useLongPress(() => setMenuOpen(true), { enabled: Boolean(menu) && !completing });
  const fireConfetti = useConfetti();
  const x = useMotionValue(0);
  // Card is RTL: swiping to the right (positive x) completes the task.
  const bgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const iconScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.6, 1]);
  const overdue = isOverdue(task.deadline, task.status);

  const triggerComplete = (originYRatio?: number) => {
    if (completing) return;
    setCompleting(true);
    fireConfetti(originYRatio ?? 0.5);
    const SLIDE_MS = 320;
    const COLLAPSE_MS = 260;
    timers.current.push(setTimeout(() => setCollapsing(true), SLIDE_MS));
    timers.current.push(setTimeout(() => onComplete(task.id), SLIDE_MS + COLLAPSE_MS));
    // If the task is still here a few seconds later (the save failed and was undone), bring the card back
    // instead of leaving an invisible, collapsed row behind.
    timers.current.push(
      setTimeout(() => {
        setCompleting(false);
        setCollapsing(false);
        x.set(0);
      }, SLIDE_MS + COLLAPSE_MS + 3500)
    );
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      triggerComplete();
    } else {
      x.set(0);
    }
  };

  return (
    <motion.div
      initial={false}
      animate={collapsing ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }}
      transition={{ duration: 0.26, ease: EASE }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Reveal layer behind the card, shown while swiping */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 flex items-center justify-end pl-5 bg-emerald-500 rounded-2xl"
      >
        <motion.div style={{ scale: iconScale }}>
          <Check className="text-white ml-5" size={26} strokeWidth={3} />
        </motion.div>
      </motion.div>

      <motion.div
        drag={task.status !== "done" ? "x" : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: SWIPE_THRESHOLD + 40 }}
        dragElastic={0.15}
        style={{ x }}
        onDragEnd={handleDragEnd}
        animate={completing ? { opacity: 0, scale: 0.92, x: SWIPE_THRESHOLD + 40 } : { scale: longPress.pressing ? 0.985 : 1 }}
        transition={{ duration: completing ? DURATION.slow : DURATION.base }}
        {...(menu ? longPress.handlers : {})}
        className={clsx(
          "relative flex items-start gap-3 rounded-2xl border p-4 shadow-card",
          // Semi-transparent + blurred (.glass, globals.css) so the personal background shows through.
          "glass border-white/70 dark:border-zinc-700/60",
          // A long press would otherwise start text selection / the browser's own menu (iPhone especially).
          menu && "select-none [-webkit-touch-callout:none]"
        )}
      >
        {/* Big satisfying checkbox — also works as a tap-to-complete fallback */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerComplete(0.35);
          }}
          aria-label="סמן כהושלם"
          className={clsx(
            "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90",
            task.status === "done"
              ? "bg-emerald-500 border-emerald-500"
              : "border-zinc-300 dark:border-zinc-600 hover:border-emerald-400"
          )}
        >
          {task.status === "done" && <Check className="text-white" size={18} strokeWidth={3} />}
        </button>

        <div
          className="min-w-0 flex-1"
          onClick={() => onOpenDetail?.(task)}
          role={onOpenDetail ? "button" : undefined}
          // Reachable by keyboard: Enter opens the task, and the keyboard's menu key (or Shift+F10) opens the long-press menu.
          tabIndex={onOpenDetail ? 0 : undefined}
          onKeyDown={(e) => {
            if (onOpenDetail && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onOpenDetail(task);
            }
          }}
        >
          <h2 className="font-semibold text-ink dark:text-ink-dark leading-snug truncate">
            {task.title}
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft dark:text-ink-dark-soft line-clamp-2">
            {task.description}
          </p>
          {creatorName && (
            <p className="mt-1 text-[11px] text-ink-soft dark:text-ink-dark-soft">מאת: {creatorName}</p>
          )}
          <StepProgress steps={task.steps} />
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            {task.deadline && (
              <span
                className={clsx(
                  "inline-flex items-center gap-1 font-medium",
                  overdue ? "text-rose-700 dark:text-rose-400 animate-pulse-soft" : "text-ink-soft dark:text-ink-dark-soft"
                )}
              >
                {overdue ? <AlertCircle size={13} /> : <Calendar size={13} />}
                {formatDeadline(task.deadline)}
              </span>
            )}
            <PriorityBadge priority={task.priority} />
            {category && <CategoryBadge category={category} />}
            {(task.attachments?.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-ink-soft dark:text-ink-dark-soft">
                <Paperclip size={13} />
                {task.attachments!.length}
              </span>
            )}
            {/* ms-auto pushes this to the far (left, in RTL) end of the row — the card's bottom corner */}
            <span
              className="ms-auto text-[10px] text-ink-soft dark:text-ink-dark-soft"
              title="מועד פתיחת המשימה"
            >
              נפתחה {formatCreatedAt(task.createdAt)}
            </span>
          </div>
        </div>
      </motion.div>

      {menu && (
        <TaskActionMenu
          task={task}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          config={menu}
          onOpenDetail={onOpenDetail}
          onComplete={() => triggerComplete()}
        />
      )}
    </motion.div>
  );
}
