"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, UserPlus, Trash2, AlertTriangle, Building2, Pencil } from "lucide-react";
import { getSession } from "@/lib/auth";
import { useTaskStore } from "@/lib/store";
import { DEFAULT_DEPARTMENT, memberRank, TeamMember } from "@/lib/types";
import {
  DepartmentRank,
  flagsFromRank,
  getDepartmentsForUnit,
  HQ_UNIT,
  ORG_UNITS,
  RANK_LABELS,
  rankFromFlags,
} from "@/lib/orgStructure";
import AppHeader from "@/components/AppHeader";
import Avatar from "@/components/Avatar";
import RoleBadge from "@/components/RoleBadge";
import LoadingScreen from "@/components/LoadingScreen";
import BottomNav from "@/components/BottomNav";

function TeamManagementInner() {
  const router = useRouter();
  const { team, tasks, loading, addMember, updateMember, removeMember } = useTaskStore();
  const [name, setName] = useState("");
  const [newUnit, setNewUnit] = useState<string>(HQ_UNIT);
  const [newDept, setNewDept] = useState<string>(getDepartmentsForUnit(HQ_UNIT)[0] ?? DEFAULT_DEPARTMENT);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editUnit, setEditUnit] = useState<string>(HQ_UNIT);
  const [editDept, setEditDept] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editRank, setEditRank] = useState<DepartmentRank>("member");
  const [editManagerId, setEditManagerId] = useState<string>("");
  const [session, setSessionState] = useState<ReturnType<typeof getSession>>(null);

  // Auth guard: a logged-in manager sees the full screen (add + manage + remove).
  // Someone with only the narrower "canAddMembers" permission may still reach this
  // screen to add people, but never gets to see task counts or remove anyone —
  // that stays manager-only, so the permission can't be used to peek at others' work.
  useEffect(() => {
    if (loading) return; // wait for team data before deciding
    const s = getSession();
    setSessionState(s);
    if (!s) {
      router.replace("/login");
      return;
    }
    const sessionMember = team.find((m) => m.id === s.userId);
    if (!sessionMember?.isManager && !sessionMember?.canAddMembers && !sessionMember?.isSuperAdmin) {
      router.replace(`/staff?user=${s.userId}`);
    }
  }, [router, team, loading]);

  if (loading) return <LoadingScreen />;

  const viewer = team.find((m) => m.id === session?.userId);
  const isFullManager = Boolean(viewer?.isManager);
  const isSuperAdmin = Boolean(viewer?.isSuperAdmin);
  const myDept = viewer?.department ?? DEFAULT_DEPARTMENT;
  const myUnit = viewer?.brigade ?? HQ_UNIT;

  // A super admin (נועם) sees and manages literally everyone, across every
  // department instance, HR included — a regular manager (like Amit) only ever
  // sees her own isolated (unit, department) pair's roster. Managers are
  // included for the super admin's view since "manage all users" spans ranks
  // too, not just soldiers.
  const roster = isSuperAdmin
    ? team.filter((m) => m.id !== viewer?.id)
    : team.filter((m) => !m.isManager && (m.department ?? DEFAULT_DEPARTMENT) === myDept && m.brigade === myUnit);

  // Group the super admin's cross-unit roster by (brigade, department) PAIR, not department
  // alone — 'משא"ן' of מפא"ג and 'משא"ן' of חטיבה 14 are separate, isolated instances that
  // happen to share a name, and must read as separate rosters, not one merged list.
  const groupedByDept: { unit: string; department: string; members: TeamMember[] }[] = isSuperAdmin
    ? Array.from(
        roster.reduce((acc, m) => {
          const unit = m.brigade ?? HQ_UNIT;
          const department = m.department ?? DEFAULT_DEPARTMENT;
          const key = `${unit}::${department}`;
          if (!acc.has(key)) acc.set(key, { unit, department, members: [] as TeamMember[] });
          acc.get(key)!.members.push(m);
          return acc;
        }, new Map<string, { unit: string; department: string; members: TeamMember[] }>())
      ).map(([, group]) => group)
    : [{ unit: myUnit, department: myDept, members: roster }];

  const handleAdd = () => {
    setError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("יש למלא שם");
      return;
    }
    // Login now requires a full name (first + last), not just a first name — mainly to keep
    // logins unique and unambiguous as the team grows and first names repeat. A single word
    // (no space) is rejected outright, regardless of how many characters it has.
    const nameParts = trimmedName.split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      setError("יש להזין שם מלא — שם פרטי ושם משפחה");
      return;
    }
    // Login is by name globally, across every department, so the uniqueness
    // check has to run against the whole team — not just this unit's roster.
    // Checked against BOTH the current display name AND loginKeyword (not just
    // name): login actually matches on loginKeyword, and the two can diverge —
    // e.g. someone's displayed name changed but their loginKeyword didn't. A new
    // member whose name only collides with an old loginKeyword would otherwise
    // pass this check yet still get rejected by the DB's unique constraint on
    // login_keyword, with a confusing generic error — or worse, could let two
    // people be confused about whose account is whose.
    const nameTaken = team.some((m) => m.name.trim() === trimmedName || m.loginKeyword === trimmedName);
    if (nameTaken) {
      setError("כבר יש איש/אשת צוות עם השם הזה — לכניסה עם שם צריך שם ייחודי");
      return;
    }
    const brigade = isSuperAdmin ? newUnit : myUnit;
    const department = isSuperAdmin ? newDept : myDept;
    const title = isSuperAdmin ? newTitle.trim() || null : null;
    addMember(trimmedName, department, brigade, title);
    setName("");
    setNewUnit(HQ_UNIT);
    setNewDept(getDepartmentsForUnit(HQ_UNIT)[0] ?? DEFAULT_DEPARTMENT);
    setNewTitle("");
  };

  const handleNewUnitChange = (unit: string) => {
    setNewUnit(unit);
    const depts = getDepartmentsForUnit(unit);
    if (!depts.includes(newDept)) setNewDept(depts[0] ?? DEFAULT_DEPARTMENT);
  };

  const handleRemove = (id: string) => {
    removeMember(id);
    setConfirmingRemoveId(null);
  };

  const startEditDept = (member: TeamMember) => {
    setEditingDeptId(member.id);
    setEditUnit(member.brigade ?? HQ_UNIT);
    setEditDept(member.department ?? DEFAULT_DEPARTMENT);
    setEditTitle(member.title ?? "");
    setEditRank(rankFromFlags(member.isManager, member.isSuperManager));
    setEditManagerId(member.managerId ?? "");
  };

  const handleEditUnitChange = (unit: string) => {
    setEditUnit(unit);
    const depts = getDepartmentsForUnit(unit);
    if (!depts.includes(editDept)) setEditDept(depts[0] ?? DEFAULT_DEPARTMENT);
  };

  const saveEditDept = (id: string) => {
    const department = editDept || DEFAULT_DEPARTMENT;
    const brigade = editUnit || HQ_UNIT;
    const { isManager, isSuperManager } = flagsFromRank(editRank);
    updateMember(id, {
      department,
      brigade,
      title: editTitle.trim() || null,
      isManager,
      isSuperManager,
      managerId: editManagerId || null,
    });
    setEditingDeptId(null);
  };

  // Eligible managers for the person currently being edited: someone else in the SAME
  // (unit, department) instance being assigned to, ranked strictly above the rank about to be
  // saved. Recomputed live off editUnit/editDept/editRank so the manager list always matches
  // whatever unit/department/rank combination is currently selected in the form.
  const eligibleManagersForEdit = editingDeptId
    ? team.filter(
        (m) =>
          m.id !== editingDeptId &&
          m.brigade === editUnit &&
          (m.department ?? DEFAULT_DEPARTMENT) === editDept &&
          memberRank(m) > memberRank(flagsFromRank(editRank))
      )
    : [];

  const taskCountFor = (id: string) => tasks.filter((t) => t.assigneeIds.includes(id)).length;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))] md:my-8 md:max-w-3xl md:rounded-3xl md:bg-surface md:shadow-xl md:dark:bg-surface-dark">
      <header className="mb-5 flex items-center justify-between">
        <AppHeader
          title={isSuperAdmin ? "ניהול-על — כל היחידות" : "ניהול משרד"}
          subtitle={
            isSuperAdmin
              ? "צפייה ועריכה של כל המשתמשים, בכל היחידות"
              : isFullManager
              ? "הוספה והסרה של חיילים"
              : "הוספת אנשי צוות חדשים"
          }
        />
        <Link
          href={isFullManager || isSuperAdmin ? "/manager" : `/staff?user=${session?.userId ?? ""}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
          aria-label="חזרה"
        >
          <ChevronRight size={18} className="text-ink-soft" />
        </Link>
      </header>

      {/* Add new soldier */}
      <section className="mb-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-5 shadow-card">
        <p className="mb-4 flex items-center gap-1.5 text-sm font-bold text-ink dark:text-ink-dark">
          <UserPlus size={16} />
          הוספת חייל/ת
        </p>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="שם פרטי ושם משפחה (זה גם מה שישמש להתחברות)"
            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
          />
          {isSuperAdmin && (
            <>
              <select
                value={newUnit}
                onChange={(e) => handleNewUnitChange(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark outline-none transition-colors"
              >
                {ORG_UNITS.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.label}
                  </option>
                ))}
              </select>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark outline-none transition-colors"
              >
                {getDepartmentsForUnit(newUnit).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="תפקיד / תואר (לא חובה, למשל קצינת סגל)"
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
              />
            </>
          )}
          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
          <button
            onClick={handleAdd}
            className="w-full rounded-2xl bg-brand-600 py-3 font-bold text-white shadow-soft transition-all active:scale-[0.98]"
          >
            הוספה למשרד
          </button>
        </div>
      </section>

      {/* Current team — task counts and removal are manager-only; someone here only
          via canAddMembers gets a plain name list, nothing about anyone's tasks.
          A super admin sees every department, grouped, with a manage-department
          control on each person — everyone else stays walled inside their own unit. */}
      {groupedByDept.map(({ unit, department, members }) => (
        <section key={`${unit}::${department}`} className="mb-6">
          <p className="mb-3 flex items-center gap-1.5 px-1 text-sm font-bold text-ink dark:text-ink-dark">
            {isSuperAdmin && <Building2 size={14} className="text-ink-soft dark:text-ink-dark-soft" />}
            {isSuperAdmin ? `${department} · ${unit}` : department === DEFAULT_DEPARTMENT ? "אנשי המשרד" : department}{" "}
            ({members.length})
          </p>
          <div className="space-y-2.5">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-3.5 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar member={member} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-ink dark:text-ink-dark">{member.name}</p>
                      <RoleBadge member={member} />
                    </div>
                    {member.title && (
                      <p className="mt-0.5 truncate text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
                        {member.title}
                      </p>
                    )}
                    {(isFullManager || isSuperAdmin) && (
                      <p className="mt-0.5 text-xs text-ink-soft dark:text-ink-dark-soft">
                        {taskCountFor(member.id)} משימות
                      </p>
                    )}
                  </div>
                  {isSuperAdmin && editingDeptId !== member.id && (
                    <button
                      onClick={() => startEditDept(member)}
                      aria-label={`עריכת פרטים עבור ${member.name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {(isFullManager || isSuperAdmin) && confirmingRemoveId !== member.id && (
                    <button
                      onClick={() => setConfirmingRemoveId(member.id)}
                      aria-label={`הסרת ${member.name}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {isSuperAdmin && editingDeptId === member.id && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/60 dark:bg-brand-500/10 p-3.5">
                    <select
                      value={editUnit}
                      onChange={(e) => handleEditUnitChange(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-ink dark:text-ink-dark outline-none"
                    >
                      {ORG_UNITS.map((u) => (
                        <option key={u.key} value={u.key}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={editDept}
                      onChange={(e) => setEditDept(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-ink dark:text-ink-dark outline-none"
                    >
                      {getDepartmentsForUnit(editUnit).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="תפקיד / תואר (לא חובה, למשל קצינת סגל)"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-ink dark:text-ink-dark outline-none"
                    />
                    <div className="border-t border-brand-200/60 dark:border-brand-500/20 pt-2">
                      <p className="mb-1.5 text-xs font-bold text-ink-soft dark:text-ink-dark-soft">
                        היררכיה בתוך המדור (סופר-אדמין בלבד)
                      </p>
                      <select
                        value={editRank}
                        onChange={(e) => {
                          const rank = e.target.value as DepartmentRank;
                          setEditRank(rank);
                          // A manager assigned under the OLD rank may no longer outrank the
                          // NEW rank (e.g. demoting a commander to member while an officer was
                          // picked as their manager is fine, but promoting to commander should
                          // clear a now-invalid selection) — drop it rather than save something
                          // that no longer makes sense.
                          const stillValid = team.some(
                            (m) =>
                              m.id === editManagerId &&
                              m.brigade === editUnit &&
                              (m.department ?? DEFAULT_DEPARTMENT) === editDept &&
                              memberRank(m) > memberRank(flagsFromRank(rank))
                          );
                          if (!stillValid) setEditManagerId("");
                        }}
                        className="mb-2 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-ink dark:text-ink-dark outline-none"
                      >
                        {(Object.keys(RANK_LABELS) as DepartmentRank[]).map((r) => (
                          <option key={r} value={r}>
                            {RANK_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editManagerId}
                        onChange={(e) => setEditManagerId(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-ink dark:text-ink-dark outline-none"
                      >
                        <option value="">ללא מפקד/ת ישיר/ה</option>
                        {eligibleManagersForEdit.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEditDept(member.id)}
                        className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white active:scale-[0.98] transition-transform"
                      >
                        שמירה
                      </button>
                      <button
                        onClick={() => setEditingDeptId(null)}
                        className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-bold text-ink-soft dark:text-ink-dark-soft active:scale-[0.98] transition-transform"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {(isFullManager || isSuperAdmin) && confirmingRemoveId === member.id && (
                  <div className="mt-3 space-y-2 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-300">
                      <AlertTriangle size={13} />
                      להסיר את {member.name}? {taskCountFor(member.id)} המשימות שלו/ה יימחקו גם כן.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white active:scale-[0.98] transition-transform"
                      >
                        הסרה
                      </button>
                      <button
                        onClick={() => setConfirmingRemoveId(null)}
                        className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-bold text-ink-soft dark:text-ink-dark-soft active:scale-[0.98] transition-transform"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-soft dark:text-ink-dark-soft">אין עדיין אנשי משרד</p>
            )}
          </div>
        </section>
      ))}

      <BottomNav base={isFullManager || isSuperAdmin ? "manager" : "staff"} />
    </main>
  );
}

export default function TeamManagementPage() {
  return (
    <Suspense fallback={null}>
      <TeamManagementInner />
    </Suspense>
  );
}
