"use client";

import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import ListItemMotion from "@/components/ListItemMotion";
import { ChevronRight, Lock, Eye, LogOut, Megaphone, Plus, Wand2, Settings, UserPlus } from "lucide-react";
import { Priority, getVisibleScope } from "@/lib/types";
import { getSession, clearSession } from "@/lib/auth";
import { disablePushOnLogout } from "@/lib/push";
import { useTaskStore } from "@/lib/store";
import { useScrollMemory } from "@/lib/useScrollMemory";
import { useTaskDeepLink } from "@/lib/useTaskDeepLink";
import { useWhatsNew } from "@/components/WhatsNewProvider";
import TaskCard from "@/components/TaskCard";
import EmptyState from "@/components/EmptyState";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import RoleBadge from "@/components/RoleBadge";
import UndoToast from "@/components/UndoToast";
import SearchBar from "@/components/SearchBar";
import PriorityFilter from "@/components/PriorityFilter";
import { CategoryFilter, matchesCategoryFilter, useCategoryFilter } from "@/components/CategoryChips";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import CreateTaskSheet from "@/components/CreateTaskSheet";
import LoadingScreen from "@/components/LoadingScreen";
import NotificationBell from "@/components/NotificationBell";
import HeaderMenu from "@/components/HeaderMenu";
import StandInList from "@/components/StandInList";
import SettingsSheet from "@/components/SettingsSheet";
import AppBackground from "@/components/AppBackground";
import AITriageSheet from "@/components/AITriageSheet";
import ProductivityWrapped from "@/components/ProductivityWrapped";

const UNDO_WINDOW_MS = 6000;

function StaffDashboardInner() {
  useDocumentTitle("המשימות שלי");
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("user") ?? "noam";

  const { tasks: allTasks, team, loading, createTasks, updateTask, deleteTask, addComment, addAttachment, removeAttachment, categories, getTaskCategory, orgUnits } = useTaskStore();
  const member = team.find((m) => m.id === userId) ?? team[1] ?? team[0];
  const { openWhatsNew } = useWhatsNew();

  const [session, setSessionState] = useState<ReturnType<typeof getSession>>(null);

  // Auth guard: allowed here if this IS the account owner, or if `userId` is anywhere in the
  // session holder's getVisibleScope — which already covers a manager viewing a subordinate,
  // a rank-independent super admin, AND now a "stand-in" (proxyIds) grant, e.g. a soldier who
  // was given access to her own manager's account despite outranking rules. One check instead
  // of three, since getVisibleScope is the single source of truth for "who can I see" everywhere
  // else in the app already.
  useEffect(() => {
    if (loading) return; // wait for team data before deciding
    const s = getSession();
    setSessionState(s);
    if (!s) {
      router.replace("/login");
      return;
    }
    const sessionMember = team.find((m) => m.id === s.userId);
    // Opened as plain /staff (the home-screen app's start page, or an old shortcut): a manager's home
    // is the command dashboard — that is where she creates tasks — not her own personal list.
    if (!searchParams.get("user") && (sessionMember?.isManager || sessionMember?.isSuperAdmin)) {
      router.replace("/manager");
      return;
    }
    const allowed = Boolean(sessionMember && getVisibleScope(sessionMember, team).some((m) => m.id === userId));
    if (!allowed) {
      router.replace(`/staff?user=${s.userId}`);
    }
  }, [router, userId, team, loading, searchParams]);

  const viewingAsManager = Boolean(session && session.userId !== userId);
  // Back goes to whatever "home" actually is for the viewer — the manager dashboard for a
  // manager/super-admin, but a proxy-only viewer (e.g. a soldier standing in for someone above
  // her) has no manager dashboard at all, so it must send her back to her own /staff page instead.
  const sessionMemberForNav = team.find((m) => m.id === session?.userId);
  const backHref = viewingAsManager
    ? sessionMemberForNav?.isManager || sessionMemberForNav?.isSuperAdmin
      ? "/manager"
      : `/staff?user=${session?.userId}`
    : undefined;

  const tasks = useMemo(() => allTasks.filter((t) => t.assigneeIds.includes(userId)), [allTasks, userId]);

  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  // Whoever is logged in — used for anything the VIEWER does (creating tasks, undo, the task sheet).
  const viewerId = session?.userId ?? userId;
  // Categories are personal, and this page shows the page owner's tasks — so it is divided by the
  // PAGE OWNER's categories and their own categorization of each task. Opening someone else's
  // profile (manager or stand-in) shows how they organized their work; going back to your own
  // screen shows yours. (Read-only for the viewer: the filter and card badges just display it.)
  const categoryOwnerId = userId;
  const myCategories = useMemo(() => categories.filter((c) => c.userId === categoryOwnerId), [categories, categoryOwnerId]);
  const [categoryFilter, setCategoryFilter] = useCategoryFilter(myCategories);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  // Looked up live from `tasks` (not snapshotted at click-time) so the open sheet
  // reflects remote changes — e.g. a new comment from a manager — while it's open.
  const detailTask = useMemo(() => (detailTaskId ? tasks.find((t) => t.id === detailTaskId) ?? null : null), [tasks, detailTaskId]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [undoTask, setUndoTask] = useState<{ id: string; title: string } | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    if (categoryFilter.size > 0) {
      base = base.filter((t) => matchesCategoryFilter(categoryFilter, getTaskCategory(t.id, categoryOwnerId)?.id));
    }
    return base;
  }, [tasks, query, priorityFilter, categoryFilter, getTaskCategory, categoryOwnerId]);

  useScrollMemory(`staff:${userId}`, !loading && !!member);
  // A notification opened the app on one of these tasks (?task=, maybe with &do=complete/snooze).
  useTaskDeepLink({ ready: !loading && !!member && !!session, tasks, actorId: session?.userId, openTask: setDetailTaskId, updateTask });

  if (loading || !member) return <LoadingScreen />;

  const viewerMember = team.find((m) => m.id === session?.userId) ?? member;
  const assignableTeam = getVisibleScope(viewerMember, team);
  // Self-viewing a *manager's own* page still excludes this (they have a dashboard for that).
  // But viewing someone ELSE's page — manager-viewing OR, new, a "stand-in" proxy — always
  // allows it, even when that person is themselves a manager: a non-manager proxy (e.g. a
  // soldier standing in for the manager above her) has no dashboard of her own to fall back on,
  // so this button is the only place she can create a task for her target at all.
  const canCreateOwnTask = viewingAsManager || !member.isManager;

  const isFiltering = Boolean(query.trim()) || priorityFilter.size > 0 || categoryFilter.size > 0;

  const handleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    updateTask(taskId, { previousStatus: task.status, status: "done" }, viewerId);
    setUndoTask({ id: taskId, title: task.title });

    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoTask(null), UNDO_WINDOW_MS);
  };

  const handleUndo = () => {
    if (!undoTask) return;
    const task = tasks.find((t) => t.id === undoTask.id);
    updateTask(undoTask.id, { status: task?.previousStatus ?? "todo" }, viewerId);
    setUndoTask(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const handleLogout = async () => {
    await disablePushOnLogout(session?.userId);
    clearSession();
    router.push("/login");
  };

  return (
    <main className="relative mx-auto min-h-dvh max-w-md px-4 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))] [--bg-scrim:rgba(250,250,250,0.82)] dark:[--bg-scrim:rgba(24,24,27,0.82)] md:my-8 md:max-w-3xl md:rounded-3xl md:bg-surface md:shadow-xl md:dark:bg-surface-dark">
      <AppBackground member={member} />
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        <AppHeader title={member.name} subtitle={viewingAsManager ? "צופה/ת במשימות של" : "שלום,"} />
        {backHref ? (
          <a
            href={backHref}
            className="flex h-11 w-11 shrink-0 items-center justify-center press rounded-full glass shadow-soft"
            aria-label="חזרה"
          >
            <ChevronRight size={18} className="text-ink-soft" />
          </a>
        ) : (
          // At most 3 fixed-size buttons here (bell, back-to-command-board for managers, ⋮) so the
          // title always keeps room on 320–375px phones; everything else lives in the ⋮ menu.
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell userId={member.id} />
            {(member.isManager || member.isSuperAdmin) && (
              <a
                href="/manager"
                className="flex h-11 w-11 items-center justify-center press rounded-full glass shadow-soft"
                aria-label="חזרה ללוח פיקוד"
                title="חזרה ללוח פיקוד"
              >
                <ChevronRight size={18} className="text-ink-soft" />
              </a>
            )}
            <HeaderMenu
              items={[
                { key: "whats-new", label: "מה חדש", icon: Megaphone, onClick: openWhatsNew },
                { key: "settings", label: "הגדרות", icon: Settings, onClick: () => setSettingsOpen(true) },
                { key: "triage", label: "טריאז׳ חכם", icon: Wand2, tone: "accent", onClick: () => setTriageOpen(true) },
                ...(!member.isManager && !member.isSuperAdmin && member.canAddMembers
                  ? [{ key: "add-member", label: "הוספת איש/אשת צוות", icon: UserPlus, href: "/manager/team" }]
                  : []),
                { key: "logout", label: "התנתקות", icon: LogOut, tone: "danger" as const, onClick: handleLogout },
              ]}
            />
          </div>
        )}
      </header>

      <div className="mb-4">
        <RoleBadge member={member} />
      </div>

      <p className="mb-4 flex items-center gap-1.5 px-1 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
        {viewingAsManager ? (
          <>
            <Eye size={12} />
            {sessionMemberForNav?.isManager || sessionMemberForNav?.isSuperAdmin
              ? `צופה/ת ועורכ/ת כמפקדת — שינויים כאן משפיעים על ${member.name}`
              : `ממלא/ת מקום — שינויים כאן משפיעים על ${member.name}`}
          </>
        ) : (
          <>
            <Lock size={12} />
            מוצגות רק המשימות שלך
          </>
        )}
      </p>

      {/* Stand-in access ("ממלא/ת מקום"): people this account was granted proxy access to, via
          their own Settings — shown only on your own page, not while already viewing someone
          else's. Without this list there'd be no way to actually reach a proxy target's page
          short of typing its URL by hand. */}
      {!viewingAsManager && assignableTeam.some((m) => m.id !== member.id) && (
        <StandInList
          targets={assignableTeam.filter((m) => m.id !== member.id)}
          ownBrigade={member.brigade}
          unitOrder={orgUnits.map((u) => u.key)}
        />
      )}

      <div className="mb-3">
        <SearchBar value={query} onChange={setQuery} placeholder="חיפוש במשימות שלי..." />
      </div>
      <div className="mb-4">
        <PriorityFilter selected={priorityFilter} onChange={setPriorityFilter} />
      </div>
      {myCategories.length > 0 && (
        <div className="-mt-2 mb-4">
          <CategoryFilter categories={myCategories} selected={categoryFilter} onChange={setCategoryFilter} />
        </div>
      )}

      {!isFiltering && <ProductivityWrapped tasks={tasks} />}

      {openTasks.length > 0 && !isFiltering && (
        <p className="mb-3 px-1 text-sm font-medium text-ink-soft dark:text-ink-dark-soft">
          {openTasks.length} משימות פתוחות · החליקו ימינה כדי לסמן כהושלם · הקישו על משימה לעריכה
        </p>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {openTasks.map((task) => (
            <ListItemMotion key={task.id}>
              <TaskCard
                task={task}
                creatorName={task.createdBy ? team.find((m) => m.id === task.createdBy)?.name : undefined}
                category={getTaskCategory(task.id, categoryOwnerId)}
                onComplete={handleComplete}
                onOpenDetail={(t) => setDetailTaskId(t.id)}
                // On someone else's page the categories shown are theirs and read-only, so the category option is hidden there.
                menu={{ actorId: viewerId, categoryOwnerId: viewingAsManager ? null : categoryOwnerId }}
              />
            </ListItemMotion>
          ))}
        </AnimatePresence>
      </div>

      {openTasks.length === 0 && !isFiltering && <EmptyState />}
      {openTasks.length === 0 && isFiltering && (
        <p className="py-10 text-center text-sm text-ink-soft dark:text-ink-dark-soft">לא נמצאו משימות תואמות</p>
      )}

      <UndoToast taskTitle={undoTask?.title ?? null} onUndo={handleUndo} />

      {canCreateOwnTask && (
        <button
          onClick={() => setSheetOpen(true)}
          className="bottom-above-nav fixed inset-x-0 z-30 mx-auto flex w-max items-center gap-2 whitespace-nowrap rounded-full bg-brand-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-95"
        >
          <Plus size={20} strokeWidth={2.5} />
          משימה חדשה
        </button>
      )}

      <CreateTaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        team={[member]}
        // Attribute to whoever is actually creating it (session owner), not the page's owner —
        // those differ now that a manager or proxy can create a task from someone else's page.
        currentUserId={viewerId}
        onCreate={(newTasks, categoryId, steps, files) =>
          createTasks(newTasks.map((t) => ({ ...t, createdBy: session?.userId ?? member.id })), {
            category: categoryId ? { userId: viewerId, categoryId } : undefined,
            steps,
            files,
          })
        }
      />

      <TaskDetailSheet
        task={detailTask}
        team={team}
        assignableTeam={assignableTeam}
        currentUserId={session?.userId ?? userId}
        onClose={() => setDetailTaskId(null)}
        onUpdate={(id, patch) => updateTask(id, patch, session?.userId)}
        onDelete={deleteTask}
        onAddComment={addComment}
        onAddAttachment={addAttachment}
        onRemoveAttachment={removeAttachment}
      />

      <AITriageSheet
        open={triageOpen}
        tasks={tasks}
        onClose={() => setTriageOpen(false)}
        onOpenDetail={(task) => {
          setTriageOpen(false);
          setDetailTaskId(task.id);
        }}
      />

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} member={member} />

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
