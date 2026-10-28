"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Task } from "./types";
import { useToast } from "@/components/ToastProvider";

/**
 * Handles a link that points at one task — what a notification opens (public/sw.js):
 *   ?task=<id>              → open that task's details
 *   ?task=<id>&do=complete  → mark it done        (the notification's "✓ סימון כהושלמה" button)
 *   ?task=<id>&do=snooze    → move it to tomorrow (the notification's "דחייה למחר" button)
 * Actions show a message with "ביטול". Afterwards the task/do part is removed from the address, so a
 * reload doesn't repeat it. A task that isn't on this screen (deleted, or not this person's) is ignored.
 */
export function useTaskDeepLink({
  ready,
  tasks,
  actorId,
  openTask,
  updateTask,
}: {
  ready: boolean;
  tasks: Task[];
  actorId: string | undefined;
  openTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>, actorId?: string) => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const handled = useRef<string | null>(null);

  const taskId = searchParams.get("task");
  const action = searchParams.get("do");

  useEffect(() => {
    if (!ready || !taskId || !actorId) return;
    const key = `${taskId}:${action ?? ""}`;
    if (handled.current === key) return;
    handled.current = key;

    // Drop task/do from the address, keep everything else (e.g. ?user=).
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete("task");
    rest.delete("do");
    router.replace(rest.toString() ? `${pathname}?${rest}` : pathname, { scroll: false });

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (action === "complete") {
      if (task.status === "done" || task.status === "cancelled") {
        showToast(`"${task.title}" כבר סגורה`);
        return;
      }
      const before = task.status;
      updateTask(task.id, { status: "done", previousStatus: before }, actorId);
      showToast(`"${task.title}" סומנה כהושלמה`, "success", {
        durationMs: 6000,
        action: { label: "ביטול", onClick: () => updateTask(task.id, { status: before }, actorId) },
      });
      return;
    }

    if (action === "snooze") {
      const before = task.deadline ?? null;
      // Tomorrow, at the same time of day as the current deadline (end of day if there was none).
      const next = new Date();
      next.setDate(next.getDate() + 1);
      if (before) {
        const old = new Date(before);
        next.setHours(old.getHours(), old.getMinutes(), 0, 0);
      } else {
        next.setHours(23, 59, 0, 0);
      }
      updateTask(task.id, { deadline: next.toISOString() }, actorId);
      showToast(`"${task.title}" נדחתה למחר`, "success", {
        durationMs: 6000,
        action: { label: "ביטול", onClick: () => updateTask(task.id, { deadline: before }, actorId) },
      });
      return;
    }

    openTask(task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, taskId, action, actorId]);
}
