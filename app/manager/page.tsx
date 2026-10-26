"use client";

import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, AlertCircle, ShieldCheck, LogOut, FileDown, Megaphone, Users, LayoutGrid, CalendarDays, Wand2, Settings, Network } from "lucide-react";
import { Priority, getVisibleScope } from "@/lib/types";
import { formatDeadline, isOverdue, isToday, exportTasksToCsv, compareByDeadlineDesc, activeTasks, completionPercent } from "@/lib/utils";
import { getSession, clearSession } from "@/lib/auth";
import { disablePushOnLogout } from "@/lib/push";
import { useTaskStore } from "@/lib/store";
import { useWhatsNew } from "@/components/WhatsNewProvider";
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
import { CategoryFilter, matchesCategoryFilter, useCategoryFilter } from "@/components/CategoryChips";
import HistoryTaskRow from "@/components/HistoryTaskRow";
import LoadingScreen from "@/components/LoadingScreen";
import { AnimatePresence } from "framer-motion";
import ListItemMotion from "@/components/ListItemMotion";
import NotificationBell from "@/components/NotificationBell";
import HeaderMenu from "@/components/HeaderMenu";
import SettingsSheet from "@/components/SettingsSheet";
import AppBackground from "@/components/AppBackground";
import AITriageSheet from "@/components/AITriageSheet";
import ProductivityWrapped from "@/components/ProductivityWrapped";
import clsx from "clsx";

function ManagerDashboardInner() {
  useDocumentTitle("לוח פיקוד");
  const router = useRouter();
  const { tasks, activity, team, loading, createTasks, updateTask, deleteTask, addComment, addAttachment, removeAttachment, categories, getTaskCategory } = useTaskStore();
  const { openWhatsNew } = useWhatsNew();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  // Looked up live from `tasks` (not snapshotted at click-time) so the open sheet
  // reflects remote changes — e.g. a comment or status update from someone else — while it's open.
  const detailTask = useMemo(() => (detailTaskId ? tasks.find((t) => t.id === detailTaskId) ?? null : null), [tasks, detailTaskId]);
  const [triageOpen, setTriageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const me = team.find((m) => m.id === sessionUserId);
  const myCategories = useMemo(() => categories.filter((c) => c.userId === sessionUserId), [categories, sessionUserId]);
  const [categoryFilter, setCategoryFilter] = useCategoryFilter(myCategories);

  // Auth guard: only a logged-in manager-tier person (manager, super-manager, or
  // a rank-independent super admin like Noam) may see this dashboard.
  useEffect(() => {
    if (loading) return; // wait for team data before deciding
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

  // the people this viewer may assign to and see the tasks/activity of (empty/self while still loading)
  const assignableTeam = me ? getVisibleScope(me, team) : [];
  const visibleIds = new Set(assignableTeam.map((m) => m.id));
  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.assigneeIds.some((id) => visibleIds.has(id))),
    [tasks, assignableTeam]
  );
  const visibleActivity = activity.filter((a) => visibleIds.has(a.userId));

  const todaysTasks = useMemo(
    () => visibleTasks.filter((t) => isToday(t.deadline) || (t.status === "done" && t.completedAt && isToday(t.completedAt))),
    [visibleTasks]
  );
  const todaysActiveTasks = activeTasks(todaysTasks);
  const todaysDoneCount = todaysActiveTasks.filter((t) => t.status === "done").length;
  const todaysTotalCount = todaysActiveTasks.length;
  const overallPercent = completionPercent(todaysTasks);

  const overdueTasks = useMemo(
    () => visibleTasks.filter((t) => isOverdue(t.deadline, t.status)),
    [visibleTasks]
  );

  const isFiltering = Boolean(query.trim()) || priorityFilter.size > 0 || categoryFilter.size > 0;

  const filteredResults = useMemo(() => {
    if (!isFiltering) return [];
    let results = visibleTasks;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      results = results.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    if (priorityFilter.size > 0) {
      results = results.filter((t) => priorityFilter.has(t.priority));
    }
    if (categoryFilter.size > 0 && sessionUserId) {
      results = results.filter((t) => matchesCategoryFilter(categoryFilter, getTaskCategory(t.id, sessionUserId)?.id));
    }
    return [...results].sort(compareByDeadlineDesc);
  }, [visibleTasks, query, priorityFilter, categoryFilter, getTaskCategory, sessionUserId, isFiltering]);

  if (loading || !me) return <LoadingScreen />;

  // everyone ranked below me, within my own department — a regular manager sees her
  // soldiers, a super-manager also sees other managers, but never anyone outside her
  // unit. Built from assignableTeam (getVisibleScope), not a raw team filter, so this
  // stays in sync with department isolation and per-manager (managerId) restriction.
  const managed = assignableTeam.filter((m) => m.id !== me.id).map((m) => {
    const mine = tasks.filter((t) => t.assigneeIds.includes(m.id));
    const mineActive = activeTasks(mine);
    return {
      member: m,
      total: mineActive.length,
      percent: completionPercent(mine),
    };
  });

  const myTasks = tasks.filter((t) => t.assigneeIds.includes(me.id));
  const myActiveTasks = activeTasks(myTasks);
  const myOpenCount = myTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;
  const myDoneCount = myActiveTasks.filter((t) => t.status === "done").length;
  const myPercent = completionPercent(myTasks);

  const handleLogout = async () => {
    await disablePushOnLogout(sessionUserId);
    clearSession();
    router.push("/login");
  };

  return (
    <main className="relative mx-auto min-h-dvh max-w-md px-4 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))] [--bg-scrim:rgba(250,250,250,0.82)] dark:[--bg-scrim:rgba(24,24,27,0.82)] md:my-8 md:max-w-3xl md:rounded-3xl md:bg-surface md:shadow-xl md:dark:bg-surface-dark">
      <AppBackground member={me} />
      {/* One row: title + bell + ⋮. This header used to hold 5–7 separate 44px icon buttons (and a
          two-row workaround for them), which still overflowed the screen on ≤375px phones for the
          super-admin. All secondary actions now live in the ⋮ menu, so the row fits at any width. */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        <AppHeader title="לוח פיקוד" subtitle={`שלום ${me.name},`} />
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell userId={me.id} />
          <HeaderMenu
            items={[
              { key: "whats-new", label: "מה חדש", icon: Megaphone, onClick: openWhatsNew },
              { key: "settings", label: "הגדרות", icon: Settings, onClick: () => setSettingsOpen(true) },
              { key: "triage", label: "טריאז׳ חכם", icon: Wand2, tone: "accent", onClick: () => setTriageOpen(true) },
              { key: "team", label: "ניהול משרד", icon: Users, href: "/manager/team" },
              ...(me.isSuperAdmin
                ? [{ key: "org-chart", label: "עץ מבנה ארגוני", icon: Network, href: "/manager/org-chart" }]
                : []),
              { key: "logout", label: "התנתקות", icon: LogOut, tone: "danger" as const, onClick: handleLogout },
            ]}
          />
        </div>
      </header>

      <div className="mb-4">
        <RoleBadge member={me} />
      </div>

      <p className="mb-4 flex items-center gap-1.5 px-1 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
        <ShieldCheck size={13} />
        {(() => {
          // No department === DEFAULT_DEPARTMENT special-case here on purpose — 'משא"ן' now
          // exists at both מפא"ג and חטיבה 10, so that check used to hide exactly the unit
          // info that tells those two isolated instances apart.
          const unit = me.department ? `${me.department}${me.brigade ? " · " + me.brigade : ""}` : "המשרד";
          if (me.isSuperAdmin) return "כ-Super Admin, יש לך גישה מלאה לכל המשימות והמשתמשים בכל היחידות";
          return me.isSuperManager
            ? `כמפקד/ת מחלקה, יש לך גישה מלאה לכל המשימות של כולם ב${unit}, כולל שאר המפקדות`
            : `כמפקד/ת, יש לך גישה מלאה לכל המשימות של כל אנשי ${unit}`;
        })()}
      </p>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1">
          <SearchBar value={query} onChange={setQuery} placeholder="חיפוש בכל המשימות..." />
        </div>
        <button
          onClick={() => exportTasksToCsv(visibleTasks, team)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-700 glass shadow-soft transition-transform active:scale-95"
          aria-label="ייצוא לאקסל"
          title="ייצוא לאקסל"
        >
          <FileDown size={18} className="text-ink-soft" />
        </button>
      </div>
      <div className="mb-5">
        <PriorityFilter selected={priorityFilter} onChange={setPriorityFilter} />
        {myCategories.length > 0 && (
          <div className="mt-2">
            <CategoryFilter categories={myCategories} selected={categoryFilter} onChange={setCategoryFilter} />
          </div>
        )}
      </div>

      {!isFiltering && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Link
            href="/manager/board"
            className="flex items-center gap-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 glass p-3.5 shadow-card transition-transform active:scale-[0.98]"
          >
            <LayoutGrid size={18} className="text-brand-600 dark:text-brand-300" />
            <span className="text-sm font-bold text-ink dark:text-ink-dark">לוח משימות</span>
          </Link>
          <Link
            href="/manager/calendar"
            className="flex items-center gap-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 glass p-3.5 shadow-card transition-transform active:scale-[0.98]"
          >
            <CalendarDays size={18} className="text-brand-600 dark:text-brand-300" />
            <span className="text-sm font-bold text-ink dark:text-ink-dark">לוח שנה</span>
          </Link>
        </div>
      )}

      {isFiltering ? (
        <section className="space-y-2">
          {filteredResults.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft dark:text-ink-dark-soft">לא נמצאו משימות תואמות</p>
          ) : (
            filteredResults.map((task) => {
              const assignees = team.filter((m) => task.assigneeIds.includes(m.id));
              return (
                <HistoryTaskRow
                  key={task.id}
                  task={task}
                  assignees={assignees}
                  category={getTaskCategory(task.id, me.id)}
                  onClick={(t) => setDetailTaskId(t.id)}
                  menu={{ actorId: me.id, categoryOwnerId: me.id }}
                />
              );
            })
          )}
        </section>
      ) : (
        <>
          {/* Shortcut to my own personal task list — placed above the managed list */}
          <Link
            href={`/staff?user=${me.id}`}
            className={clsx(
              "mb-6 flex items-center gap-4 rounded-2xl border p-4 shadow-card transition-transform active:scale-[0.98]",
              myOpenCount === 0
                ? "border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10"
                : "border-brand-100 dark:border-brand-500/20 bg-brand-50/[var(--glass-alpha)] backdrop-blur-[6px] dark:bg-brand-500/10"
            )}
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
          <section className="mb-5 flex items-center gap-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 glass p-5 shadow-card">
            <ProgressRing percent={overallPercent} sublabel="הושלם" />
            <div>
              <p className="text-sm font-semibold text-ink dark:text-ink-dark">התקדמות כללית להיום</p>
              <p className="mt-0.5 text-xs text-ink-soft dark:text-ink-dark-soft">
                {todaysTotalCount === 0
                  ? "אין משימות מתוזמנות להיום"
                  : todaysTotalCount === 1
                  ? `משימה ${todaysDoneCount} מתוך ${todaysTotalCount} הושלמה`
                  : `${todaysDoneCount} מתוך ${todaysTotalCount} משימות הושלמו`}
              </p>
            </div>
          </section>

          <ProductivityWrapped tasks={visibleTasks} />

          {/* Managed people's rings — tap to view and update their tasks */}
          <section className="mb-5">
            <p className="mb-3 px-1 text-sm font-bold text-ink dark:text-ink-dark">
              {me.isSuperManager ? "התקדמות לפי איש/אשת משרד" : "התקדמות לפי חייל/ת"}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {managed.map(({ member, percent, total }) => (
                <Link
                  key={member.id}
                  href={`/staff?user=${member.id}`}
                  className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-zinc-100 dark:border-zinc-800 glass p-3 shadow-card transition-transform active:scale-95"
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
                <AnimatePresence initial={false}>
                {overdueTasks.map((task) => {
                  const assignees = team.filter((m) => task.assigneeIds.includes(m.id));
                  if (assignees.length === 0) return null;
                  return (
                    <ListItemMotion key={task.id}>
                    <div
                      onClick={() => setDetailTaskId(task.id)}
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
                        <p className="text-xs text-rose-700 dark:text-rose-300">
                          דדליין היה ב-{formatDeadline(task.deadline)}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    </ListItemMotion>
                  );
                })}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Activity stream */}
          <section className="mb-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 glass p-5 shadow-card">
            <p className="mb-4 text-sm font-bold text-ink dark:text-ink-dark">יומן פעילות</p>
            <ActivityTimeline events={visibleActivity} team={team} />
          </section>
        </>
      )}

      {/* Floating create-task button, sitting above the bottom nav — paired with a smaller,
          plainer calendar shortcut just to its left, so getting to day-by-day task creation
          (see /manager/calendar's own "+" per day) doesn't require scrolling back up to the
          "לוח שנה" card every time. DOM order matters here: this pill renders first so it sits
          on the right in RTL, with the round calendar button after it, to its left. */}
      {/* inset-x-0 + mx-auto + w-max centers it against the full screen width. The old
          `left-1/2 -translate-x-1/2` capped its width at HALF the screen (the shrink-to-fit
          width of a left-offset fixed box), so on phones the pill's label wrapped onto two lines. */}
      <div className="bottom-above-nav fixed inset-x-0 z-30 mx-auto flex w-max max-w-[calc(100%-2rem)] flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 whitespace-nowrap rounded-full bg-brand-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-95"
        >
          <Plus size={20} strokeWidth={2.5} />
          משימה חדשה
        </button>
        <Link
          href="/manager/calendar"
          aria-label="לוח שנה"
          title="לוח שנה"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card text-ink-soft shadow-lg transition-transform active:scale-95"
        >
          <CalendarDays size={19} />
        </Link>
      </div>

      <CreateTaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        team={assignableTeam}
        currentUserId={me.id}
        onCreate={(newTasks, categoryId, steps, files) =>
          createTasks(newTasks.map((t) => ({ ...t, createdBy: me.id })), {
            category: categoryId ? { userId: me.id, categoryId } : undefined,
            steps,
            files,
          })
        }
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

      <AITriageSheet
        open={triageOpen}
        tasks={visibleTasks}
        team={team}
        onClose={() => setTriageOpen(false)}
        onOpenDetail={(task) => {
          setTriageOpen(false);
          setDetailTaskId(task.id);
        }}
      />

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} member={me} />

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
