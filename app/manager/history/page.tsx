"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Task, Priority, getVisibleScope } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { useTaskStore } from "@/lib/store";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import MonthHistory from "@/components/MonthHistory";
import SearchBar from "@/components/SearchBar";
import PriorityFilter from "@/components/PriorityFilter";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import LoadingScreen from "@/components/LoadingScreen";
import clsx from "clsx";

function ManagerHistoryInner() {
  const { tasks, team, loading, updateTask, deleteTask, addComment } = useTaskStore();
  const [groupBy, setGroupBy] = useState<"member" | "day">("member");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const session = getSession();
  const me = team.find((m) => m.id === session?.userId);

  if (loading || !me) return <LoadingScreen />;

  const assignableTeam = getVisibleScope(me, team);
  const visibleIds = new Set(assignableTeam.map((m) => m.id));
  const visibleTasks = tasks.filter((t) => t.assigneeIds.some((id) => visibleIds.has(id)));

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))] md:my-8 md:rounded-3xl md:bg-surface md:shadow-xl md:dark:bg-surface-dark">
      <header className="mb-5 flex items-center justify-between">
        <AppHeader title="היסטוריית משימות" subtitle="כל המשרד" />
        <Link
          href="/manager"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
          aria-label="חזרה"
        >
          <ChevronRight size={18} className="text-ink-soft" />
        </Link>
      </header>

      <p className="mb-4 flex items-center gap-1.5 px-1 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
        <ShieldCheck size={13} />
        כמפקד/ת, מוצגות לך המשימות של כל אנשי המשרד
      </p>

      <div className="mb-3">
        <SearchBar value={query} onChange={setQuery} placeholder="חיפוש בכל ההיסטוריה..." />
      </div>
      <div className="mb-4">
        <PriorityFilter selected={priorityFilter} onChange={setPriorityFilter} />
      </div>

      {!query.trim() && (
        <div className="mb-4 flex rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-1 shadow-card">
          <button
            onClick={() => setGroupBy("member")}
            className={clsx(
              "flex-1 rounded-xl py-2 text-sm font-bold transition-colors",
              groupBy === "member" ? "bg-brand-600 text-white" : "text-ink-soft dark:text-ink-dark-soft"
            )}
          >
            לפי חייל/ת
          </button>
          <button
            onClick={() => setGroupBy("day")}
            className={clsx(
              "flex-1 rounded-xl py-2 text-sm font-bold transition-colors",
              groupBy === "day" ? "bg-brand-600 text-white" : "text-ink-soft dark:text-ink-dark-soft"
            )}
          >
            לפי תאריך
          </button>
        </div>
      )}

      <MonthHistory
        tasks={visibleTasks}
        team={team}
        showAssignee
        groupBy={groupBy}
        searchQuery={query}
        priorityFilter={priorityFilter}
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

export default function ManagerHistoryPage() {
  return (
    <Suspense fallback={null}>
      <ManagerHistoryInner />
    </Suspense>
  );
}
