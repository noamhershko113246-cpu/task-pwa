"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Lock, Eye } from "lucide-react";
import { Task, Priority } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { useTaskStore } from "@/lib/store";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import MonthHistory from "@/components/MonthHistory";
import SearchBar from "@/components/SearchBar";
import PriorityFilter from "@/components/PriorityFilter";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import LoadingScreen from "@/components/LoadingScreen";

function StaffHistoryInner() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user") ?? "noam";
  const { tasks: allTasks, team, loading, updateTask, deleteTask, addComment } = useTaskStore();
  const member = team.find((m) => m.id === userId) ?? team[1] ?? team[0];
  const session = getSession();
  const viewingAsManager = Boolean(session && session.userId !== userId);

  const myTasks = allTasks.filter((t) => t.assigneeIds.includes(userId));

  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  if (loading || !member) return <LoadingScreen />;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <AppHeader title="היסטוריית משימות" subtitle={member.name} />
        <Link
          href={`/staff?user=${userId}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
          aria-label="חזרה"
        >
          <ChevronRight size={18} className="text-ink-soft" />
        </Link>
      </header>

      <p className="mb-4 flex items-center gap-1.5 px-1 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
        {viewingAsManager ? (
          <>
            <Eye size={12} />
            צופה/ת כמפקדת בהיסטוריה של {member.name}
          </>
        ) : (
          <>
            <Lock size={12} />
            מוצגות רק המשימות שלך
          </>
        )}
      </p>

      <div className="mb-3">
        <SearchBar value={query} onChange={setQuery} placeholder="חיפוש בהיסטוריה..." />
      </div>
      <div className="mb-4">
        <PriorityFilter selected={priorityFilter} onChange={setPriorityFilter} />
      </div>

      <MonthHistory
        tasks={myTasks}
        team={team}
        searchQuery={query}
        priorityFilter={priorityFilter}
        onOpenTask={setDetailTask}
      />

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

export default function StaffHistoryPage() {
  return (
    <Suspense fallback={null}>
      <StaffHistoryInner />
    </Suspense>
  );
}
