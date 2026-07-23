"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Lock, Eye, LogOut } from "lucide-react";
import { Task, Priority, memberRank } from "@/lib/types";
import { getSession, clearSession } from "@/lib/auth";
import { useTaskStore } from "@/lib/store";
import TaskCard from "@/components/TaskCard";
import EmptyState from "@/components/EmptyState";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import RoleBadge from "@/components/RoleBadge";
import UndoToast from "@/components/UndoToast";
import SearchBar from "@/components/SearchBar";
import PriorityFilter from "@/components/PriorityFilter";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import LoadingScreen from "@/components/LoadingScreen";

const UNDO_WINDOW_MS = 6000;

function StaffDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("user") ?? "noam";

  const { tasks: allTasks, team, loading, updateTask, deleteTask, addComment } = useTaskStore();
  const member = team.find((m) => m.id === userId) ?? team[1] ?? team[0];

  const [session, setSessionState] = useState<ReturnType<typeof getSession>>(null);

  // Auth guard: only the account owner, or a manager viewing on someone's behalf, may be here.
  useEffect(() => {
    if (loading) return; // wait for team data before deciding
    const s = getSession();
    setSessionState(s);
    if (!s) {
      router.replace("/login");
      return;
    }
    const sessionMember = team.find((m) => m.id === s.userId);
    const targetMember = team.find((m) => m.id === userId);
    const isSelf = s.userId === userId;
    const isManagerViewing = Boolean(
      sessionMember && targetMember && memberRank(sessionMember) > memberRank(targetMember)
    );
    if (!isSelf && !isManagerViewing) {
      router.replace(`/staff?user=${s.userId}`);
    }
  }, [router, userId, team, loading]);

  const viewingAsManager = Boolean(session && session.userId !== userId);
  const backHref = viewingAsManager ? "/manager" : undefined;

  const tasks = useMemo(() => allTasks.filter((t) => t.assigneeIds.includes(userId)), [allTasks, userId]);

  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [undoTask, setUndoTask] = useState<{ id: string; title: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTasks = useMemo(() => {
    let base = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      base = base.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    if (priorityFilter.size > 0) {
      base = base.filter((t) => priorityFilter.has(t.priority));
    }
    return base;
  }, [tasks, query, priorityFilter]);

  if (loading || !member) return <LoadingScreen />;

  const isFiltering = Boolean(query.trim()) || priorityFilter.size > 0;

  const handleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    updateTask(taskId, { previousStatus: task.status, status: "done" });
    setUndoTask({ id: taskId, title: task.title });

    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoTask(null), UNDO_WINDOW_MS);
  };

  const handleUndo = () => {
    if (!undoTask) return;
    const task = tasks.find((t) => t.id === undoTask.id);
    updateTask(undoTask.id, { status: task?.previousStatus ?? "todo" });
    setUndoTask(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6">
      <header className="mb-3 flex items-center justify-between">
        <AppHeader title={member.name} subtitle={viewingAsManager ? "צופה/ת במשימות של" : "שלום,"} />
        {backHref ? (
          <a
            href={backHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
            aria-label="חזרה"
          >
            <ChevronRight size={18} className="text-ink-soft" />
          </a>
        ) : (
          <button
            onClick={handleLogout}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
            aria-label="התנתקות"
          >
            <LogOut size={16} className="text-ink-soft" />
          </button>
        )}
      </header>

      <div className="mb-4">
        <RoleBadge member={member} />
      </div>

      <p className="mb-4 flex items-center gap-1.5 px-1 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
        {viewingAsManager ? (
          <>
            <Eye size={12} />
            צופה/ת ועורכ/ת כמפקדת — שינויים כאן משפיעים על {member.name}
          </>
        ) : (
          <>
            <Lock size={12} />
            מוצגות רק המשימות שלך
          </>
        )}
      </p>

      <div className="mb-3">
        <SearchBar value={query} onChange={setQuery} placeholder="חיפוש במשימות שלי..." />
      </div>
      <div className="mb-4">
        <PriorityFilter selected={priorityFilter} onChange={setPriorityFilter} />
      </div>

      {openTasks.length > 0 && !isFiltering && (
        <p className="mb-3 px-1 text-sm font-medium text-ink-soft dark:text-ink-dark-soft">
          {openTasks.length} משימות פתוחות · החליקו ימינה כדי לסמן כהושלם · הקישו על משימה לעריכה
        </p>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {openTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
            >
              <TaskCard task={task} onComplete={handleComplete} onOpenDetail={setDetailTask} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {openTasks.length === 0 && !isFiltering && <EmptyState />}
      {openTasks.length === 0 && isFiltering && (
        <p className="py-10 text-center text-sm text-ink-soft dark:text-ink-dark-soft">לא נמצאו משימות תואמות</p>
      )}

      <UndoToast taskTitle={undoTask?.title ?? null} onUndo={handleUndo} />

      <TaskDetailSheet
        task={detailTask}
        team={team}
        currentUserId={session?.userId ?? userId}
        onClose={() => setDetailTask(null)}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onAddComment={addComment}
      />

      <BottomNav base="staff" />
    </main>
  );
}

export default function StaffDashboard() {
  return (
    <Suspense fallback={null}>
      <StaffDashboardInner />
    </Suspense>
  );
}
