"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TaskStatus, getVisibleScope } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { useTaskStore } from "@/lib/store";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import KanbanBoard from "@/components/KanbanBoard";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import LoadingScreen from "@/components/LoadingScreen";
import UndoToast from "@/components/UndoToast";

const UNDO_WINDOW_MS = 6000;

function ManagerBoardInner() {
  const router = useRouter();
  const { tasks, team, loading, updateTask, deleteTask, addComment, addAttachment, removeAttachment } = useTaskStore();
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const detailTask = detailTaskId ? tasks.find((t) => t.id === detailTaskId) ?? null : null;
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const me = team.find((m) => m.id === sessionUserId);
  // Dragging a card to "הושלם" is the same action as the swipe-to-complete gesture
  // on the staff dashboard, so it gets the same 6-second undo — a mis-drop
  // shouldn't require opening the task detail sheet just to revert one status.
  const [undoTask, setUndoTask] = useState<{ id: string; title: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const sessionMember = team.find((m) => m.id === session.userId);
    if (!sessionMember?.isManager && !sessionMember?.isSuperAdmin) {
      router.replace(`/staff?user=${session.userId}`);
      return;
    }
    setSessionUserId(session.userId);
  }, [router, team, loading]);

  if (loading || !me) return <LoadingScreen />;

  const assignableTeam = getVisibleScope(me, team);
  const visibleIds = new Set(assignableTeam.map((m) => m.id));
  const visibleTasks = tasks.filter((t) => t.status !== "cancelled" && t.assigneeIds.some((id) => visibleIds.has(id)));

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (status === "done") {
      updateTask(taskId, { previousStatus: task.status, status });
      setUndoTask({ id: taskId, title: task.title });
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndoTask(null), UNDO_WINDOW_MS);
    } else {
      updateTask(taskId, { status });
    }
  };

  const handleUndo = () => {
    if (!undoTask) return;
    const task = tasks.find((t) => t.id === undoTask.id);
    updateTask(undoTask.id, { status: task?.previousStatus ?? "todo" });
    setUndoTask(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  return (
    // Wider than every other screen's max-w-md on purpose: the board's whole point is
    // columns side-by-side, and md:max-w-md would otherwise squeeze all 4 into a
    // phone-width card on desktop, forcing horizontal scrolling *inside* the card
    // instead of just using the screen. md:max-w-6xl fits all 4 w-64 columns without it.
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))] md:my-8 md:max-w-6xl md:rounded-3xl md:bg-surface md:shadow-xl md:dark:bg-surface-dark">
      <header className="mb-5 flex items-center justify-between">
        <AppHeader title="לוח פיקוד — משימות" subtitle="גררו כרטיס בין העמודות" />
        <Link
          href="/manager"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
          aria-label="חזרה"
        >
          <ChevronRight size={18} className="text-ink-soft" />
        </Link>
      </header>

      <KanbanBoard
        tasks={visibleTasks}
        team={team}
        onStatusChange={handleStatusChange}
        onOpenDetail={(t) => setDetailTaskId(t.id)}
      />

      <TaskDetailSheet
        task={detailTask}
        team={team}
        assignableTeam={assignableTeam}
        currentUserId={me.id}
        onClose={() => setDetailTaskId(null)}
        onUpdate={(id, patch) => updateTask(id, patch, me.id)}
        onDelete={deleteTask}
        onAddComment={addComment}
        onAddAttachment={addAttachment}
        onRemoveAttachment={removeAttachment}
      />

      <UndoToast taskTitle={undoTask?.title ?? null} onUndo={handleUndo} />

      <BottomNav base="manager" />
    </main>
  );
}

export default function ManagerBoardPage() {
  return (
    <Suspense fallback={null}>
      <ManagerBoardInner />
    </Suspense>
  );
}
