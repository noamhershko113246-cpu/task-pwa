"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Task, getVisibleScope } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { useTaskStore } from "@/lib/store";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import CalendarView from "@/components/CalendarView";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import LoadingScreen from "@/components/LoadingScreen";

function ManagerCalendarInner() {
  const router = useRouter();
  const { tasks, team, loading, updateTask, deleteTask, addComment } = useTaskStore();
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const me = team.find((m) => m.id === sessionUserId);

  useEffect(() => {
    if (loading) return;
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const sessionMember = team.find((m) => m.id === session.userId);
    if (!sessionMember?.isManager) {
      router.replace(`/staff?user=${session.userId}`);
      return;
    }
    setSessionUserId(session.userId);
  }, [router, team, loading]);

  if (loading || !me) return <LoadingScreen />;

  const assignableTeam = getVisibleScope(me, team);
  const visibleIds = new Set(assignableTeam.map((m) => m.id));
  const visibleTasks = tasks.filter((t) => t.status !== "cancelled" && t.assigneeIds.some((id) => visibleIds.has(id)));

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))] md:my-8 md:rounded-3xl md:bg-surface md:shadow-xl md:dark:bg-surface-dark">
      <header className="mb-5 flex items-center justify-between">
        <AppHeader title="לוח שנה" subtitle="דד-ליינים של כל המשרד" />
        <Link
          href="/manager"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
          aria-label="חזרה"
        >
          <ChevronRight size={18} className="text-ink-soft" />
        </Link>
      </header>

      <CalendarView
        tasks={visibleTasks}
        team={team}
        onOpenTask={setDetailTask}
      />

      <TaskDetailSheet
        task={detailTask}
        team={team}
        assignableTeam={assignableTeam}
        currentUserId={me.id}
        onClose={() => setDetailTask(null)}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onAddComment={addComment}
      />

      <BottomNav base="manager" />
    </main>
  );
}

export default function ManagerCalendarPage() {
  return (
    <Suspense fallback={null}>
      <ManagerCalendarInner />
    </Suspense>
  );
}
