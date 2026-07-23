"use client";

import { useState } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Check, Calendar, AlertCircle } from "lucide-react";
import { Task } from "@/lib/types";
import { formatDeadline, isOverdue } from "@/lib/utils";
import { useConfetti } from "@/hooks/useConfetti";
import PriorityBadge from "./PriorityBadge";
import clsx from "clsx";

const SWIPE_THRESHOLD = 110;

export default function TaskCard({
  task,
  onComplete,
  onOpenDetail,
}: {
  task: Task;
  onComplete: (taskId: string) => void;
  onOpenDetail?: (task: Task) => void;
}) {
  const [completing, setCompleting] = useState(false);
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
    setTimeout(() => onComplete(task.id), 320);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      triggerComplete();
    } else {
      x.set(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
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
        animate={completing ? { opacity: 0, scale: 0.92, x: SWIPE_THRESHOLD + 40 } : {}}
        transition={{ duration: 0.28 }}
        className={clsx(
          "relative flex items-start gap-3 rounded-2xl border p-4 shadow-card",
          "bg-white dark:bg-surface-dark-card border-zinc-100 dark:border-zinc-800"
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
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90",
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
        >
          <h3 className="font-semibold text-ink dark:text-ink-dark leading-snug truncate">
            {task.title}
          </h3>
          <p className="mt-0.5 text-sm text-ink-soft dark:text-ink-dark-soft line-clamp-2">
            {task.description}
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span
              className={clsx(
                "inline-flex items-center gap-1 font-medium",
                overdue ? "text-rose-500 animate-pulse-soft" : "text-ink-soft dark:text-ink-dark-soft"
              )}
            >
              {overdue ? <AlertCircle size={13} /> : <Calendar size={13} />}
              {formatDeadline(task.deadline)}
            </span>
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
