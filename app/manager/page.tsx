"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, AlertCircle, ShieldCheck, LogOut, FileDown, Users } from "lucide-react";
import { Task, Priority, memberRank } from "@/lib/types";
import { formatDeadline, isOverdue, exportTasksToCsv } from "@/lib/utils";
import { getSession, clearSession } from "@/lib/auth";
import { useTaskStore } from "@/lib/store";
import ProgressRing from "@/components/ProgressRing";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import Avatar from "@/components/Avatar";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ActivityTimeline from "@/components/ActivityTimeline";
import CreateTaskSheet from "@/components/CreateTaskSheet";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import RoleBadge from "@/components/RoleBadge";
import SearchBar from "@/components/SearchBar";
import PriorityFilter from "@/components/PriorityFilter";
import HistoryTaskRow from "@/components/HistoryTaskRow";
import LoadingScreen from "@/components/LoadingScreen";

function ManagerDashboardInner() {
  const router = useRouter();
  const { tasks, activity, team, loading, createTasks, updateTask, deleteTask, addComment } = useTaskStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const me = team.find((m) => m.id === sessionUserId);

  // Auth guard: only a logged-in manager-tier person (manager or super-manager) may see this dashboard.
  useEffect(() => {
    if (loading) return; // wait for team data before deciding
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

  const overallPercent =
    (tasks.filter((t) => t.status === "done").length / tasks.length) * 100;

  const overdueTasks = useMemo(
    () => tasks.filter((t) => isOverdue(t.deadline, t.status)),
    [tasks]
  );

  const isFiltering = Boolean(query.trim()) || priorityFilter.size > 0;

  const filteredResults = useMemo(() => {
    if (!isFiltering) return [];
    let results = tasks;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      results = results.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    if (priorityFilter.size > 0) {
      results = results.filter((t) => priorityFilter.has(t.priority));
    }
    return [...results].sort((a, b) => (a.deadline < b.deadline ? 1 : -1));
  }, [tasks, query, priorityFilter, isFiltering]);

  if (loading || !me) return <LoadingScreen />;

  // everyone ranked below me — a regular manager sees soldiers; a super-manager also sees other managers
  const myRank = memberRank(me);
  const managed = team.filter((m) => m.id !== me.id && memberRank(m) < myRank).map((m) => {
    const mine = tasks.filter((t) => t.assigneeIds.includes(m.id));
    const done = mine.filter((t) => t.status === "done").length;
    return {
      member: m,
      total: mine.length,
      percent: mine.length ? (done / mine.length) * 100 : 0,
    };
  });

  const myTasks = tasks.filter((t) => t.assigneeIds.includes(me.id));
  const myOpenCount = myTasks.filter((t) => t.status !== "done").length;
  const myDoneCount = myTasks.filter((t) => t.status === "done").length;
  const myPercent = myTasks.length ? (myDoneCount / myTasks.length) * 100 : 0;

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  return (
    <main className="relative mx-auto min-h-dvh max-w-md px-4 pb-28 pt-6">
      <header className="mb-3 flex items-center justify-between">
        <AppHeader title="דשבורד ניהולי" subtitle={`שלום ${me.name},`} />
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/manager/team"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
            aria-label="ניהול צוות"
            title="ניהול צוות"
          >
            <Users size={16} className="text-ink-soft" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
            aria-label="התנתקות"
          >
            <LogOut size={16} className="text-ink-soft" />
          </button>
        </div>
      </header>

      <div className="mb-4">
        <RoleBadge member={me} />
      </div>

      <p className="mb-4 flex items-center gap-1.5 px-1 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
        <ShieldCheck size={13} />
        {me.isSuperManager
          ? "כמפקדה ראשית, יש לך גישה מלאה לכל המשימות של כולם, כולל שאר המפקדות"
          : "כמפקדת, יש לך גישה מלאה לכל המשימות של כל חברי הצוות"}
      </p>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1">
          <SearchBar value={query} onChange={setQuery} placeholder="חיפוש בכל המשימות..." />
        </div>
        <button
          onClick={() => exportTasksToCsv(tasks, team)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-surface-dark-card shadow-soft transition-transform active:scale-95"
          aria-label="ייצוא לאקסל"
          title="ייצוא לאקסל"
        >
          <FileDown size={18} className="text-ink-soft" />
        </button>
      </div>
      <div className="mb-5">
        <PriorityFilter selected={priorityFilter} onChange={setPriorityFilter} />
      </div>

      {isFiltering ? (
        <section className="space-y-2">
          {filteredResults.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft dark:text-ink-dark-soft">לא נמצאו משימות תואמות</p>
          ) : (
            filteredResults.map((task) => {
              const assignees = team.filter((m) => task.assigneeIds.includes(m.id));
              return (
                <HistoryTaskRow key={task.id} task={task} assignees={assignees} onClick={setDetailTask} />
              );
            })
          )}
        </section>
      ) : (
        <>
          {/* Shortcut to my own personal task list — placed above the managed list */}
          <Link
            href={`/staff?user=${me.id}`}
            className="mb-6 flex items-center gap-4 rounded-2xl border border-brand-100 dark:border-brand-500/20 bg-brand-50 dark:bg-brand-500/10 p-4 shadow-card transition-transform active:scale-[0.98]"
          >
            <ProgressRing percent={myPercent} size={56} strokeWidth={6} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink dark:text-ink-dark">המשימות האישיות שלי</p>
              <p className="text-xs text-ink-soft dark:text-ink-dark-soft">
                {myOpenCount > 0 ? `${myOpenCount} משימות פתוחות` : "אין משימות פתוחות ✨"}
              </p>
            </div>
          </Link>

          {/* Overall progress */}
          <section className="mb-5 flex items-center gap-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-5 shadow-card">
            <ProgressRing percent={overallPercent} sublabel="הושלם" />
            <div>
              <p className="text-sm font-semibold text-ink dark:text-ink-dark">התקדמות כללית להיום</p>
              <p className="mt-0.5 text-xs text-ink-soft dark:text-ink-dark-soft">
                {tasks.filter((t) => t.status === "done").length} מתוך {tasks.length} משימות הושלמו
              </p>
            </div>
          </section>

          {/* Managed people's rings — tap to view and update their tasks */}
          <section className="mb-5">
            <p className="mb-3 px-1 text-sm font-bold text-ink dark:text-ink-dark">
              {me.isSuperManager ? "התקדמות לפי איש/אשת צוות" : "התקדמות לפי חייל/ת"}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {managed.map(({ member, percent, total }) => (
                <Link
                  key={member.id}
                  href={`/staff?user=${member.id}`}
                  className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-3 shadow-card transition-transform active:scale-95"
                >
                  <ProgressRing percent={percent} size={64} strokeWidth={7} />
                  <div className="flex items-center gap-1.5">
                    <Avatar member={member} size="sm" />
                    <span className="text-xs font-semibold text-ink dark:text-ink-dark">{member.name}</span>
                  </div>
                  <span className="text-[10px] text-ink-soft dark:text-ink-dark-soft">{total} משימות</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Overdue — gentle pulsing red flags, tap to edit */}
          {overdueTasks.length > 0 && (
            <section className="mb-5">
              <p className="mb-3 flex items-center gap-1.5 px-1 text-sm font-bold text-rose-600 dark:text-rose-300">
                <AlertCircle size={16} />
                חורגות מדדליין ({overdueTasks.length})
              </p>
              <div className="space-y-2.5">
                {overdueTasks.map((task) => {
                  const assignees = team.filter((m) => task.assigneeIds.includes(m.id));
                  if (assignees.length === 0) return null;
                  return (
                    <div
                      key={task.id}
                      onClick={() => setDetailTask(task)}
                      className="flex items-center gap-3 rounded-2xl border border-rose-200/70 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-500/10 p-3.5 animate-pulse-soft"
                    >
                      <PriorityBadge priority={task.priority} variant="dot" />
                      <div className="flex shrink-0 -space-x-2 space-x-reverse">
                        {assignees.slice(0, 3).map((a) => (
                          <Avatar key={a.id} member={a} size="sm" ring />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink dark:text-ink-dark">{task.title}</p>
                        <p className="text-xs text-rose-500 dark:text-rose-300">
                          דדליין היה ב-{formatDeadline(task.deadline)}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Activity stream */}
          <section className="mb-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-5 shadow-card">
            <p className="mb-4 text-sm font-bold text-ink dark:text-ink-dark">יומן פעילות</p>
            <ActivityTimeline events={activity} team={team} />
          </section>
        </>
      )}

      {/* Floating create-task button, sitting above the bottom nav */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-95"
      >
        <Plus size={20} strokeWidth={2.5} />
        משימה חדשה
      </button>

      <CreateTaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        team={team}
        onCreate={createTasks}
      />

      <TaskDetailSheet
        task={detailTask}
        team={team}
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

export default function ManagerDashboard() {
  return (
    <Suspense fallback={null}>
      <ManagerDashboardInner />
    </Suspense>
  );
}
