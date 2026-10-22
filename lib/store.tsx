"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode, useRef } from "react";
import { Task, ActivityEvent, TeamMember, Comment, Attachment, TaskStatus, Priority, STATUS_LABELS, DEFAULT_DEPARTMENT, Category, TaskStep, StepDraft } from "./types";
import { supabase } from "./supabase";
import { useToast } from "@/components/ToastProvider";
import { removeTaskAttachmentFile } from "./attachments";
import { HQ_UNIT, OrgUnit, SEED_ORG_UNITS } from "./orgStructure";

// Exported so the Settings UI can offer the exact same palette as a picker, instead of only
// ever being assigned round-robin at creation time.
export const AVATAR_COLORS: [string, string][] = [
  ["from-sky-400", "to-sky-600"],
  ["from-rose-400", "to-rose-600"],
  ["from-amber-400", "to-amber-600"],
  ["from-emerald-400", "to-emerald-600"],
  ["from-violet-400", "to-violet-600"],
  ["from-cyan-400", "to-cyan-600"],
  ["from-fuchsia-400", "to-fuchsia-600"],
  ["from-lime-400", "to-lime-600"],
];

/** First letter of the first word + first letter of the last word (e.g. "עמית כהן" -> "עכ") —
 *  now that names are required to be first+last, this keeps initials actually distinguishing
 *  people instead of two different "עמית ..."s both showing "עמ". Falls back to the first two
 *  characters for a lone single-word name (only relevant to data that predates the full-name
 *  requirement). */
function computeInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}

/** Max rows per insert request — keeps big recurring batches (instances × steps) from one giant request. */
const INSERT_BATCH_SIZE = 500;

// --- DB row <-> app type mapping (DB uses snake_case) ---

interface TeamRow {
  id: string;
  name: string;
  initials: string;
  color_from: string;
  color_to: string;
  is_manager: boolean;
  is_super_manager: boolean;
  phone: string;
  login_keyword: string | null;
  daily_summary_enabled: boolean;
  daily_summary_time: string | null;
  daily_summary_scope: "all" | "due_soon";
  background_url: string | null;
  background_preset: string | null;
  working_hours_enabled: boolean;
  working_hours_start: string | null;
  working_hours_end: string | null;
  overdue_reminder_interval_minutes: number;
  manager_id: string | null;
  can_add_members: boolean;
  department: string;
  brigade: string; // NOT NULL in the DB, one of ORG_UNITS' keys — see lib/orgStructure.ts
  is_super_admin: boolean;
  title: string | null;
  avatar_url: string | null;
  proxy_ids: string[];
}

interface TaskRow {
  id: string;
  title: string;
  description: string;
  assignee_ids: string[];
  deadline: string | null;
  status: TaskStatus;
  priority: Priority;
  recurrence_id: string | null;
  previous_status: TaskStatus | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface CommentRow {
  id: string;
  task_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

interface AttachmentRow {
  id: string;
  task_id: string;
  uploaded_by: string | null;
  file_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface ActivityRow {
  id: string;
  user_id: string | null;
  task_id: string | null;
  task_title: string;
  action: string;
  created_at: string;
}

interface OrgUnitRow {
  key: string;
  label: string;
  created_at: string;
  is_seed: boolean;
}

interface OrgDepartmentRow {
  id: string;
  unit_key: string;
  name: string;
  created_at: string;
  is_seed: boolean;
}

interface StepRow {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  done_by: string | null;
  done_at: string | null;
  sort_order: number;
  created_at: string;
}

function stepFromRow(r: StepRow): TaskStep {
  return {
    id: r.id,
    taskId: r.task_id,
    title: r.title,
    isDone: r.is_done,
    doneBy: r.done_by ?? undefined,
    doneAt: r.done_at ?? undefined,
    sortOrder: r.sort_order,
  };
}

interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

interface TaskCategoryRow {
  task_id: string;
  user_id: string;
  category_id: string;
}

/** taskCategories is keyed by task AND user — each person files a shared task under their own category. */
function taskCategoryKey(taskId: string, userId: string) {
  return `${taskId}:${userId}`;
}

function categoryFromRow(r: CategoryRow): Category {
  return { id: r.id, userId: r.user_id, name: r.name, color: r.color, sortOrder: r.sort_order };
}

function memberFromRow(r: TeamRow): TeamMember {
  return {
    id: r.id,
    name: r.name,
    initials: r.initials,
    colorFrom: r.color_from,
    colorTo: r.color_to,
    isManager: r.is_manager,
    isSuperManager: r.is_super_manager,
    phone: r.phone,
    loginKeyword: r.login_keyword ?? undefined,
    dailySummaryEnabled: r.daily_summary_enabled,
    dailySummaryTime: r.daily_summary_time,
    dailySummaryScope: r.daily_summary_scope,
    backgroundUrl: r.background_url,
    backgroundPreset: r.background_preset,
    workingHoursEnabled: r.working_hours_enabled,
    workingHoursStart: r.working_hours_start,
    workingHoursEnd: r.working_hours_end,
    overdueReminderIntervalMinutes: r.overdue_reminder_interval_minutes,
    managerId: r.manager_id,
    canAddMembers: r.can_add_members,
    department: r.department,
    brigade: r.brigade,
    isSuperAdmin: r.is_super_admin,
    title: r.title,
    avatarUrl: r.avatar_url,
    proxyIds: r.proxy_ids ?? [],
  };
}

function taskFromRow(r: TaskRow): Omit<Task, "comments"> {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    assigneeIds: r.assignee_ids ?? [],
    deadline: r.deadline,
    status: r.status,
    priority: r.priority,
    createdAt: r.created_at,
    recurrenceId: r.recurrence_id ?? undefined,
    previousStatus: r.previous_status ?? undefined,
    completedAt: r.completed_at ?? undefined,
    createdBy: r.created_by ?? undefined,
  };
}

function commentFromRow(r: CommentRow): Comment {
  return { id: r.id, userId: r.user_id, text: r.text, timestamp: r.created_at };
}

function attachmentFromRow(r: AttachmentRow): Attachment {
  return {
    id: r.id,
    taskId: r.task_id,
    uploadedBy: r.uploaded_by ?? undefined,
    fileUrl: r.file_url,
    fileName: r.file_name,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    timestamp: r.created_at,
  };
}

function activityFromRow(r: ActivityRow): ActivityEvent {
  return { id: r.id, userId: r.user_id ?? "", taskId: r.task_id ?? "", taskTitle: r.task_title, action: r.action, timestamp: r.created_at };
}

interface TaskStoreValue {
  loading: boolean;
  tasks: Task[];
  activity: ActivityEvent[];
  team: TeamMember[];
  orgUnits: OrgUnit[];
  categories: Category[];
  // options.category: file every created task under this category for that one user (their own pick
  // in the create sheet) — other assignees are left uncategorized, since categories are personal.
  // options.steps: step titles, in order — copied onto every created task (each recurring instance
  // gets its own fresh, all-open set).
  createTasks: (
    newTasks: Omit<Task, "id" | "createdAt" | "status">[],
    options?: { category?: { userId: string; categoryId: string }; steps?: string[] }
  ) => void;
  // actorId: who's actually performing this edit — required to log/notify correctly when a
  // reassignment amounts to one person transferring the task to another (see updateTask below).
  updateTask: (id: string, patch: Partial<Task>, actorId?: string) => void;
  deleteTask: (id: string, scope: "one" | "series") => void;
  addComment: (taskId: string, userId: string, text: string) => void;
  addAttachment: (
    taskId: string,
    uploadedBy: string,
    file: { url: string; fileName: string; mimeType: string; sizeBytes: number }
  ) => void;
  removeAttachment: (attachmentId: string) => void;
  addMember: (name: string, department?: string, brigade?: string | null, title?: string | null) => void;
  updateMember: (
    id: string,
    patch: {
      name?: string;
      phone?: string;
      dailySummaryEnabled?: boolean;
      dailySummaryTime?: string | null;
      dailySummaryScope?: "all" | "due_soon";
      backgroundUrl?: string | null;
      backgroundPreset?: string | null;
      workingHoursEnabled?: boolean;
      workingHoursStart?: string | null;
      workingHoursEnd?: string | null;
      overdueReminderIntervalMinutes?: number;
      department?: string;
      brigade?: string; // required by the DB now — always one of ORG_UNITS' keys, never null
      title?: string | null;
      avatarUrl?: string | null;
      colorFrom?: string;
      colorTo?: string;
      proxyIds?: string[];
      // Rank within a department (see lib/orgStructure.ts's DepartmentRank) and who this person
      // reports to — both Super Admin-only to edit (enforced in the UI, not here).
      isManager?: boolean;
      isSuperManager?: boolean;
      managerId?: string | null;
    }
  ) => void;
  removeMember: (id: string) => void;
  // Super-admin-only in the UI (enforced by the org-chart page's route guard, not here):
  // lets new units/departments be created instead of only picking from the seeded list.
  addOrgUnit: (key: string, label: string) => void;
  addOrgDepartment: (unitKey: string, name: string) => void;
  addCategory: (userId: string, name: string, color: string) => void;
  updateCategory: (id: string, patch: { name?: string; color?: string; sortOrder?: number }) => void;
  removeCategory: (id: string) => void;
  /** null clears it — the task goes back to "no category" for this user only. */
  setTaskCategory: (taskId: string, userId: string, categoryId: string | null) => void;
  getTaskCategory: (taskId: string, userId: string) => Category | undefined;
  /**
   * Commits the task sheet's edited step list in one go (on "save"): deletes, inserts, renames,
   * reorders and done/undone changes. List edits are creator-only and the in-order lock is enforced
   * by the UI (TaskStepsChecklist), not here.
   */
  saveTaskSteps: (taskId: string, baseline: StepDraft[], draft: StepDraft[], actorId: string) => void;
  /**
   * Checks / unchecks ONE saved step right away (no "save" needed), so progress is never lost when
   * the task sheet is closed. Applied locally first, then conditionally in the DB. The in-order
   * lock is enforced by the UI (TaskStepsChecklist), like saveTaskSteps.
   */
  setStepDone: (taskId: string, stepId: string, done: boolean, actorId: string) => void;
}

const TaskStoreContext = createContext<TaskStoreValue | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [rawTasks, setRawTasks] = useState<Omit<Task, "comments">[]>([]);
  const [commentsByTask, setCommentsByTask] = useState<Record<string, Comment[]>>({});
  const [attachmentsByTask, setAttachmentsByTask] = useState<Record<string, Attachment[]>>({});
  const [stepsByTask, setStepsByTask] = useState<Record<string, TaskStep[]>>({});
  const stepsByTaskRef = useRef<Record<string, TaskStep[]>>({});
  stepsByTaskRef.current = stepsByTask;
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [orgUnitRows, setOrgUnitRows] = useState<OrgUnitRow[]>([]);
  const [orgDeptRows, setOrgDeptRows] = useState<OrgDepartmentRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taskCategories, setTaskCategories] = useState<Record<string, string>>({}); // taskCategoryKey -> category id
  const categoriesRef = useRef<Category[]>([]);
  categoriesRef.current = categories;
  const teamRef = useRef<TeamMember[]>([]);
  teamRef.current = team;
  const rawTasksRef = useRef<Omit<Task, "comments">[]>([]);
  rawTasksRef.current = rawTasks;

  // Reading from refs (always current) rather than closing over state directly means
  // every function below can be wrapped in useCallback with a stable, minimal
  // dependency list — instead of a new function identity on every single render.
  const findMember = useCallback((id: string) => teamRef.current.find((m) => m.id === id), []);

  /** Surfaces a Supabase error as a toast. Returns true if there WAS an error (so callers can bail out). */
  const reportIfError = useCallback(
    (error: { message: string } | null, actionLabel: string): boolean => {
      if (!error) return false;
      console.error(`${actionLabel} failed:`, error.message);
      showToast(`${actionLabel} נכשל — נסו שוב. אם זה חוזר, בדקו את החיבור לאינטרנט.`, "error");
      return true;
    },
    [showToast]
  );

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [teamRes, tasksRes, commentsRes, attachmentsRes, activityRes, orgUnitsRes, orgDeptsRes, categoriesRes, taskCategoriesRes, stepsRes] = await Promise.all([
        supabase.from("team_members").select("*").order("created_at"),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("task_comments").select("*").order("created_at"),
        supabase.from("task_attachments").select("*").order("created_at"),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("org_units").select("*").order("created_at"),
        supabase.from("org_departments").select("*").order("created_at"),
        supabase.from("user_categories").select("*").order("sort_order").order("created_at"),
        supabase.from("task_category_assignments").select("task_id, user_id, category_id"),
        supabase.from("task_steps").select("*").order("sort_order").order("created_at"),
      ]);
      if (cancelled) return;
      if (teamRes.error || tasksRes.error) {
        showToast("לא הצלחנו לטעון את הנתונים. בדקו את החיבור לאינטרנט ורעננו את הדף.", "error");
      }
      if (teamRes.data) setTeam(teamRes.data.map(memberFromRow));
      if (tasksRes.data) setRawTasks(tasksRes.data.map(taskFromRow));
      if (commentsRes.data) {
        const grouped: Record<string, Comment[]> = {};
        for (const row of commentsRes.data as CommentRow[]) {
          const c = commentFromRow(row);
          (grouped[row.task_id] ??= []).push(c);
        }
        setCommentsByTask(grouped);
      }
      if (attachmentsRes.data) {
        const grouped: Record<string, Attachment[]> = {};
        for (const row of attachmentsRes.data as AttachmentRow[]) {
          const a = attachmentFromRow(row);
          (grouped[row.task_id] ??= []).push(a);
        }
        setAttachmentsByTask(grouped);
      }
      if (activityRes.data) setActivity((activityRes.data as ActivityRow[]).map(activityFromRow));
      if (orgUnitsRes.data) setOrgUnitRows(orgUnitsRes.data as OrgUnitRow[]);
      if (orgDeptsRes.data) setOrgDeptRows(orgDeptsRes.data as OrgDepartmentRow[]);
      if (categoriesRes.data) setCategories((categoriesRes.data as CategoryRow[]).map(categoryFromRow));
      if (taskCategoriesRes.data) {
        const map: Record<string, string> = {};
        for (const row of taskCategoriesRes.data as TaskCategoryRow[]) {
          map[taskCategoryKey(row.task_id, row.user_id)] = row.category_id;
        }
        setTaskCategories(map);
      }
      if (stepsRes.data) {
        const grouped: Record<string, TaskStep[]> = {};
        for (const row of stepsRes.data as StepRow[]) {
          (grouped[row.task_id] ??= []).push(stepFromRow(row));
        }
        setStepsByTask(grouped);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime subscriptions — this is what makes changes appear live on every device.
  useEffect(() => {
    const channel = supabase
      .channel("task-pwa-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setTeam((prev) => prev.filter((m) => m.id !== (payload.old as TeamRow).id));
        } else {
          const m = memberFromRow(payload.new as TeamRow);
          setTeam((prev) => {
            const exists = prev.some((x) => x.id === m.id);
            return exists ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m];
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deletedId = (payload.old as TaskRow).id;
          setRawTasks((prev) => prev.filter((t) => t.id !== deletedId));
        } else {
          const t = taskFromRow(payload.new as TaskRow);
          setRawTasks((prev) => {
            const exists = prev.some((x) => x.id === t.id);
            return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [t, ...prev];
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments" }, (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new as CommentRow;
        const c = commentFromRow(row);
        setCommentsByTask((prev) => {
          const existing = prev[row.task_id] ?? [];
          if (existing.some((x) => x.id === c.id)) return prev;
          return { ...prev, [row.task_id]: [...existing, c] };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_attachments" }, (payload) => {
        if (payload.eventType === "DELETE") {
          // Postgres only guarantees the primary key on a DELETE's "old" row by default
          // (REPLICA IDENTITY DEFAULT) — task_id isn't reliably present, so this has to search
          // every task's list rather than jumping straight to one via task_id.
          const deletedId = (payload.old as { id: string }).id;
          setAttachmentsByTask((prev) => {
            let changed = false;
            const next: Record<string, Attachment[]> = {};
            for (const [taskId, list] of Object.entries(prev)) {
              const filtered = list.filter((x) => x.id !== deletedId);
              if (filtered.length !== list.length) changed = true;
              next[taskId] = filtered;
            }
            return changed ? next : prev;
          });
          return;
        }
        const row = payload.new as AttachmentRow;
        const a = attachmentFromRow(row);
        setAttachmentsByTask((prev) => {
          const existing = prev[row.task_id] ?? [];
          if (existing.some((x) => x.id === a.id)) return prev;
          return { ...prev, [row.task_id]: [...existing, a] };
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        const a = activityFromRow(payload.new as ActivityRow);
        setActivity((prev) => [a, ...prev]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "org_units" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setOrgUnitRows((prev) => prev.filter((u) => u.key !== (payload.old as OrgUnitRow).key));
        } else {
          const u = payload.new as OrgUnitRow;
          setOrgUnitRows((prev) => {
            const exists = prev.some((x) => x.key === u.key);
            return exists ? prev.map((x) => (x.key === u.key ? u : x)) : [...prev, u];
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "org_departments" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deletedId = (payload.old as OrgDepartmentRow).id;
          setOrgDeptRows((prev) => prev.filter((d) => d.id !== deletedId));
        } else {
          const d = payload.new as OrgDepartmentRow;
          setOrgDeptRows((prev) => {
            const exists = prev.some((x) => x.id === d.id);
            return exists ? prev.map((x) => (x.id === d.id ? d : x)) : [...prev, d];
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_categories" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deletedId = (payload.old as CategoryRow).id;
          setCategories((prev) => prev.filter((c) => c.id !== deletedId));
          // The DB cascade removes its assignments too; mirror that locally right away.
          setTaskCategories((prev) => Object.fromEntries(Object.entries(prev).filter(([, cid]) => cid !== deletedId)));
        } else {
          const c = categoryFromRow(payload.new as CategoryRow);
          setCategories((prev) => {
            const exists = prev.some((x) => x.id === c.id);
            return exists ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c];
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_category_assignments" }, (payload) => {
        // task_category_assignments has REPLICA IDENTITY FULL, so a DELETE's old row is complete.
        if (payload.eventType === "DELETE") {
          const row = payload.old as TaskCategoryRow;
          const key = taskCategoryKey(row.task_id, row.user_id);
          setTaskCategories((prev) => {
            if (prev[key] !== row.category_id) return prev; // already replaced by a newer pick
            const next = { ...prev };
            delete next[key];
            return next;
          });
        } else {
          const row = payload.new as TaskCategoryRow;
          setTaskCategories((prev) => ({ ...prev, [taskCategoryKey(row.task_id, row.user_id)]: row.category_id }));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_steps" }, (payload) => {
        // task_steps has REPLICA IDENTITY FULL, so a DELETE's old row includes task_id.
        if (payload.eventType === "DELETE") {
          const row = payload.old as StepRow;
          setStepsByTask((prev) => {
            const list = prev[row.task_id];
            if (!list?.some((s) => s.id === row.id)) return prev;
            return { ...prev, [row.task_id]: list.filter((s) => s.id !== row.id) };
          });
        } else {
          const s = stepFromRow(payload.new as StepRow);
          setStepsByTask((prev) => {
            const list = prev[s.taskId] ?? [];
            const exists = list.some((x) => x.id === s.id);
            return { ...prev, [s.taskId]: exists ? list.map((x) => (x.id === s.id ? s : x)) : [...list, s] };
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const logActivity = useCallback(async (event: Omit<ActivityEvent, "id" | "timestamp">) => {
    await supabase.from("activity_log").insert({
      user_id: event.userId || null,
      task_id: event.taskId || null,
      task_title: event.taskTitle,
      action: event.action,
    });
  }, []);

  const sendPush = useCallback((userIds: string[], title: string, body: string, url?: string) => {
    if (userIds.length === 0) return;
    // Push is best-effort — a failure here should never break the app or show
    // the user an error toast. But it used to fail 100% silently (no console
    // output, nowhere to look), which made real problems undiagnosable. Now
    // every failure mode is at least logged to the console.
    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, title, body, url }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error(`[push] send failed (HTTP ${res.status}): ${errText}`);
          return;
        }
        const data = await res.json().catch(() => null as { sent?: number; failed?: number } | null);
        if (data?.failed) {
          console.error(`[push] ${data.failed} of ${(data.sent ?? 0) + data.failed} notifications failed to deliver`, data);
        }
      })
      .catch((err) => {
        console.error("[push] request to /api/push/send failed:", err);
      });
  }, []);

  const createTasks: TaskStoreValue["createTasks"] = useCallback((newTasks, options) => {
    (async () => {
      const rows = newTasks.map((t) => ({
        title: t.title,
        description: t.description,
        assignee_ids: t.assigneeIds,
        deadline: t.deadline,
        priority: t.priority,
        recurrence_id: t.recurrenceId ?? null,
        created_by: t.createdBy ?? null,
        status: "todo",
      }));
      const { data, error } = await supabase.from("tasks").insert(rows).select();
      if (reportIfError(error, "יצירת המשימה")) return;
      if (data) {
        const createdRows = data as TaskRow[];

        // Steps and category are part of the task — if either fails to save, the whole creation is
        // rolled back (deleting the tasks cascades away anything partially saved) rather than leaving
        // a task silently missing its steps/category.
        const rollBack = async (label: string, err: { message: string }) => {
          await supabase.from("tasks").delete().in("id", createdRows.map((r) => r.id));
          reportIfError(err, label);
        };

        const stepTitles = (options?.steps ?? []).map((s) => s.trim()).filter(Boolean);
        const insertedSteps: StepRow[] = [];
        if (stepTitles.length > 0) {
          const stepRows = createdRows.flatMap((row) =>
            stepTitles.map((title, i) => ({ task_id: row.id, title, sort_order: i }))
          );
          // A long recurring series × many steps can be thousands of rows — sent in batches.
          for (let i = 0; i < stepRows.length; i += INSERT_BATCH_SIZE) {
            const { data: batch, error: stepsError } = await supabase
              .from("task_steps")
              .insert(stepRows.slice(i, i + INSERT_BATCH_SIZE))
              .select();
            if (stepsError) return rollBack("יצירת המשימה", stepsError);
            insertedSteps.push(...((batch ?? []) as StepRow[]));
          }
        }

        // Every instance of a recurring batch lands in the same category.
        if (options?.category) {
          const { userId, categoryId } = options.category;
          const catRows = createdRows.map((row) => ({ task_id: row.id, user_id: userId, category_id: categoryId }));
          for (let i = 0; i < catRows.length; i += INSERT_BATCH_SIZE) {
            const { error: catError } = await supabase
              .from("task_category_assignments")
              .insert(catRows.slice(i, i + INSERT_BATCH_SIZE));
            if (catError) return rollBack("יצירת המשימה", catError);
          }
          setTaskCategories((prev) => {
            const next = { ...prev };
            for (const row of createdRows) next[taskCategoryKey(row.id, userId)] = categoryId;
            return next;
          });
        }

        if (insertedSteps.length > 0) {
          setStepsByTask((prev) => {
            const next = { ...prev };
            for (const r of insertedSteps) {
              const list = next[r.task_id] ?? [];
              if (!list.some((s) => s.id === r.id)) next[r.task_id] = [...list, stepFromRow(r)];
            }
            return next;
          });
        }

        showToast(createdRows.length > 1 ? `${createdRows.length} משימות נוצרו בהצלחה` : "המשימה נוצרה בהצלחה");

        // Build every activity_log row up front and insert them all in one request,
        // instead of one `await` per task (which was serial and slow for recurring batches).
        const activityRows = createdRows.map((row) => {
          const names = row.assignee_ids.map((id) => findMember(id)?.name ?? "").filter(Boolean).join(", ");
          return {
            user_id: row.created_by || row.assignee_ids[0] || null,
            task_id: row.id,
            task_title: row.title,
            // Dual-form regardless of role — there's no gender field on team_members,
            // and hardcoding the feminine form for managers (as this used to do) reads
            // wrong the moment any manager is male.
            action: `יצר/ה משימה עבור ${names}`,
          };
        });
        await supabase.from("activity_log").insert(activityRows);

        // Group pushes by (recipient, self-assigned?) so someone getting 13 recurring
        // instances gets ONE push ("13 משימות חדשות"), not 13 separate notifications.
        const pushGroups = new Map<string, { userId: string; isSelf: boolean; creatorName: string; url: string; count: number; lastTitle: string }>();
        for (const row of createdRows) {
          const creator = row.created_by ? findMember(row.created_by) : undefined;
          for (const id of row.assignee_ids) {
            const isSelf = id === row.created_by;
            const key = `${id}:${isSelf}`;
            const existing = pushGroups.get(key);
            pushGroups.set(key, {
              userId: id,
              isSelf,
              creatorName: creator?.name ?? "",
              url: `/staff?user=${id}`,
              count: (existing?.count ?? 0) + 1,
              lastTitle: row.title,
            });
          }
        }
        for (const group of pushGroups.values()) {
          const single = group.count === 1;
          const title = group.isSelf
            ? single ? "נוספה משימה חדשה" : "נוספו לך משימות"
            : single ? `קיבלת משימה מ${group.creatorName}` : `קיבלת משימות מ${group.creatorName}`;
          const body = single ? group.lastTitle : `${group.count} משימות חדשות`;
          sendPush([group.userId], title, body, group.url);
        }
      }
    })();
  }, [findMember, logActivity, sendPush, reportIfError, showToast]);

  const updateTask: TaskStoreValue["updateTask"] = useCallback((id, patch, actorId) => {
    (async () => {
      // Captured before the write so it still reflects pre-update assignees — local state only
      // catches up once the realtime echo arrives, which never happens synchronously here.
      const taskBeforeUpdate = rawTasksRef.current.find((t) => t.id === id);

      const dbPatch: Record<string, unknown> = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.description !== undefined) dbPatch.description = patch.description;
      if (patch.assigneeIds !== undefined) dbPatch.assignee_ids = patch.assigneeIds;
      if (patch.deadline !== undefined) dbPatch.deadline = patch.deadline;
      if (patch.status !== undefined) {
        dbPatch.status = patch.status;
        // Track exactly when a task became done, so "today's progress" can be
        // computed correctly instead of counting every done task ever.
        dbPatch.completed_at = patch.status === "done" ? new Date().toISOString() : null;
      }
      if (patch.priority !== undefined) dbPatch.priority = patch.priority;
      if (patch.previousStatus !== undefined) dbPatch.previous_status = patch.previousStatus;
      const { error } = await supabase.from("tasks").update(dbPatch).eq("id", id);
      if (reportIfError(error, "עדכון המשימה")) return;

      // Status pushes go only to the task's own assignees — never to every manager in the system,
      // and never to whoever made the change themselves.
      if (patch.status !== undefined && taskBeforeUpdate) {
        const recipients = (patch.assigneeIds ?? taskBeforeUpdate.assigneeIds).filter((uid) => uid !== actorId);
        for (const uid of recipients) {
          sendPush(
            [uid],
            "עדכון סטטוס במשימה",
            `"${taskBeforeUpdate.title}" עודכנה ל: ${STATUS_LABELS[patch.status]}`,
            `/staff?user=${uid}`
          );
        }
      }

      // Reassignment ("transfer") — most relevant to a proxy handing a task off to whoever she's
      // standing in for, from her own screen, without ever opening his. Logged + pushed to the
      // newly-added assignee(s) specifically so it's visible who actually made the change, since
      // task.createdBy never changes here (it still points at whoever originally made the task).
      if (patch.assigneeIds !== undefined && taskBeforeUpdate) {
        const oldIds = taskBeforeUpdate.assigneeIds;
        const newIds = patch.assigneeIds;
        const added = newIds.filter((x) => !oldIds.includes(x));
        if (added.length > 0) {
          const actor = actorId ? findMember(actorId) : undefined;
          const addedNames = added.map((aid) => findMember(aid)?.name ?? "").filter(Boolean).join(", ");
          await logActivity({
            userId: actorId ?? "",
            taskId: id,
            taskTitle: taskBeforeUpdate.title,
            action: `העביר/ה את המשימה ל${addedNames}`,
          });
          const recipients = added.filter((aid) => aid !== actorId);
          if (recipients.length > 0) {
            sendPush(
              recipients,
              actor ? `קיבלת משימה מ${actor.name}` : "קיבלת משימה חדשה",
              taskBeforeUpdate.title,
              `/staff?user=${recipients[0]}`
            );
          }
        }
      }
    })();
  }, [sendPush, reportIfError, findMember, logActivity]);

  const deleteTask: TaskStoreValue["deleteTask"] = useCallback((id, scope) => {
    (async () => {
      if (scope === "series") {
        const target = rawTasksRef.current.find((t) => t.id === id);
        if (target?.recurrenceId) {
          const { error } = await supabase.from("tasks").delete().eq("recurrence_id", target.recurrenceId);
          if (reportIfError(error, "מחיקת הסדרה")) return;
          showToast("הסדרה החוזרת בוטלה");
          return;
        }
      }
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (reportIfError(error, "מחיקת המשימה")) return;
      showToast("המשימה נמחקה");
    })();
  }, [reportIfError, showToast]);

  const addComment: TaskStoreValue["addComment"] = useCallback((taskId, userId, text) => {
    (async () => {
      const commenter = findMember(userId);
      const task = rawTasksRef.current.find((t) => t.id === taskId);
      const { error } = await supabase.from("task_comments").insert({ task_id: taskId, user_id: userId, text });
      if (reportIfError(error, "שליחת ההערה")) return;
      // Dual-form regardless of role — see the identical note in createTasks above.
      await logActivity({ userId, taskId, taskTitle: task?.title ?? "", action: "הוסיף/ה הערה" });
      if (task) {
        const managerIds = teamRef.current.filter((m) => m.isManager && m.id !== userId).map((m) => m.id);
        sendPush(managerIds, `הערה חדשה מ${commenter?.name ?? ""}`, `"${task.title}": ${text}`, "/manager");
      }
    })();
  }, [findMember, logActivity, sendPush, reportIfError]);

  const addAttachment: TaskStoreValue["addAttachment"] = useCallback((taskId, uploadedBy, file) => {
    (async () => {
      const uploader = findMember(uploadedBy);
      const task = rawTasksRef.current.find((t) => t.id === taskId);
      const { error } = await supabase.from("task_attachments").insert({
        task_id: taskId,
        uploaded_by: uploadedBy,
        file_url: file.url,
        file_name: file.fileName,
        mime_type: file.mimeType,
        size_bytes: file.sizeBytes,
      });
      if (reportIfError(error, "העלאת הקובץ")) return;
      await logActivity({ userId: uploadedBy, taskId, taskTitle: task?.title ?? "", action: `צירף/ה קובץ (${file.fileName})` });
      if (task) {
        const managerIds = teamRef.current.filter((m) => m.isManager && m.id !== uploadedBy).map((m) => m.id);
        sendPush(managerIds, `קובץ חדש מ${uploader?.name ?? ""}`, `"${task.title}": ${file.fileName}`, "/manager");
      }
    })();
  }, [findMember, logActivity, sendPush, reportIfError]);

  const removeAttachment: TaskStoreValue["removeAttachment"] = useCallback((attachmentId) => {
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("task_attachments")
        .select("file_url")
        .eq("id", attachmentId)
        .single();
      if (reportIfError(fetchError, "מחיקת הקובץ")) return;
      const { error } = await supabase.from("task_attachments").delete().eq("id", attachmentId);
      if (reportIfError(error, "מחיקת הקובץ")) return;
      if (data?.file_url) await removeTaskAttachmentFile(data.file_url as string);
    })();
  }, [reportIfError]);

  const addMember: TaskStoreValue["addMember"] = useCallback((name, department, brigade, title) => {
    (async () => {
      const trimmedName = name.trim();
      const [colorFrom, colorTo] = AVATAR_COLORS[teamRef.current.length % AVATAR_COLORS.length];
      // Login is by name only now (no phone/SMS-code flow) — login_keyword is
      // what actually authenticates; `phone` is kept only because the column
      // is NOT NULL, filled with a placeholder that can never match a login.
      // department defaults to DEFAULT_DEPARTMENT (HR) so anyone adding a member
      // without specifying a unit — the pre-existing flow — behaves exactly as
      // before; callers within a specific department (e.g. Amit's team page)
      // pass their own department/brigade so the new person lands in the same
      // isolated unit as whoever added them.
      const { error } = await supabase.from("team_members").insert({
        name: trimmedName,
        initials: computeInitials(trimmedName),
        color_from: colorFrom,
        color_to: colorTo,
        phone: `no-phone-login-${Date.now()}`,
        login_keyword: trimmedName,
        department: department ?? DEFAULT_DEPARTMENT,
        brigade: brigade ?? HQ_UNIT, // brigade is NOT NULL in the DB — no unit means "מפא"ג" by default
        title: title ?? null,
      });
      if (reportIfError(error, "הוספת החייל/ת")) return;
      showToast(`${trimmedName} נוסף/ה בהצלחה לצוות`);
    })();
  }, [reportIfError, showToast]);

  const updateMember: TaskStoreValue["updateMember"] = useCallback((id, patch) => {
    (async () => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) {
        dbPatch.name = patch.name.trim();
        dbPatch.initials = computeInitials(patch.name.trim());
      }
      if (patch.phone !== undefined) dbPatch.phone = patch.phone.trim();
      if (patch.dailySummaryEnabled !== undefined) dbPatch.daily_summary_enabled = patch.dailySummaryEnabled;
      if (patch.dailySummaryTime !== undefined) dbPatch.daily_summary_time = patch.dailySummaryTime;
      if (patch.dailySummaryScope !== undefined) dbPatch.daily_summary_scope = patch.dailySummaryScope;
      if (patch.backgroundUrl !== undefined) dbPatch.background_url = patch.backgroundUrl;
      if (patch.backgroundPreset !== undefined) dbPatch.background_preset = patch.backgroundPreset;
      if (patch.workingHoursEnabled !== undefined) dbPatch.working_hours_enabled = patch.workingHoursEnabled;
      if (patch.workingHoursStart !== undefined) dbPatch.working_hours_start = patch.workingHoursStart;
      if (patch.workingHoursEnd !== undefined) dbPatch.working_hours_end = patch.workingHoursEnd;
      if (patch.overdueReminderIntervalMinutes !== undefined)
        dbPatch.overdue_reminder_interval_minutes = patch.overdueReminderIntervalMinutes;
      if (patch.department !== undefined) dbPatch.department = patch.department;
      if (patch.brigade !== undefined) dbPatch.brigade = patch.brigade;
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
      if (patch.colorFrom !== undefined) dbPatch.color_from = patch.colorFrom;
      if (patch.colorTo !== undefined) dbPatch.color_to = patch.colorTo;
      if (patch.proxyIds !== undefined) dbPatch.proxy_ids = patch.proxyIds;
      if (patch.isManager !== undefined) dbPatch.is_manager = patch.isManager;
      if (patch.isSuperManager !== undefined) dbPatch.is_super_manager = patch.isSuperManager;
      if (patch.managerId !== undefined) dbPatch.manager_id = patch.managerId;
      const { error } = await supabase.from("team_members").update(dbPatch).eq("id", id);
      if (reportIfError(error, "עדכון הפרטים")) return;
      // Applied locally right away rather than relying solely on the realtime echo to bring it
      // back — that echo can lag or (seen in practice) sometimes never arrive for this table,
      // which made a change like "mark as commander" silently invisible until a manual reload.
      // `patch`'s keys already match TeamMember's own field names, so this is a safe direct merge.
      setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
      // Silent settings toggles (like the reminder popover) don't need their own
      // toast — only show one when an actual name/phone edit happened.
      if (patch.name !== undefined || patch.phone !== undefined) showToast("הפרטים עודכנו בהצלחה");
    })();
  }, [reportIfError, showToast]);

  const removeMember: TaskStoreValue["removeMember"] = useCallback((id) => {
    (async () => {
      const removedName = findMember(id)?.name ?? "";
      // assignee_ids is a plain array column now (no FK cascade), so we clean it
      // up ourselves: drop this person from any shared task, and delete tasks
      // that would be left with no assignee at all.
      const { data: affected, error: fetchError } = await supabase
        .from("tasks")
        .select("id, assignee_ids")
        .contains("assignee_ids", [id]);
      if (reportIfError(fetchError, "הסרת החייל/ת")) return;

      if (affected) {
        for (const row of affected as { id: string; assignee_ids: string[] }[]) {
          const remaining = row.assignee_ids.filter((x) => x !== id);
          if (remaining.length === 0) {
            await supabase.from("tasks").delete().eq("id", row.id);
          } else {
            await supabase.from("tasks").update({ assignee_ids: remaining }).eq("id", row.id);
          }
        }
      }

      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (reportIfError(error, "הסרת החייל/ת")) return;
      showToast(`${removedName} הוסר/ה מהצוות`);
    })();
  }, [findMember, reportIfError, showToast]);

  const addOrgUnit: TaskStoreValue["addOrgUnit"] = useCallback((key, label) => {
    (async () => {
      const trimmedKey = key.trim();
      const trimmedLabel = label.trim();
      const { error } = await supabase.from("org_units").insert({ key: trimmedKey, label: trimmedLabel });
      if (reportIfError(error, "יצירת היחידה")) return;
      // Applied locally right away — see the same note on updateMember above; the org_units
      // primary key IS the trimmed key itself, so no round-trip is needed to know it.
      setOrgUnitRows((prev) =>
        prev.some((u) => u.key === trimmedKey)
          ? prev
          : [...prev, { key: trimmedKey, label: trimmedLabel, created_at: new Date().toISOString(), is_seed: false }]
      );
      showToast(`היחידה "${trimmedLabel}" נוצרה בהצלחה`);
    })();
  }, [reportIfError, showToast]);

  const addOrgDepartment: TaskStoreValue["addOrgDepartment"] = useCallback((unitKey, name) => {
    (async () => {
      const trimmedName = name.trim();
      const { data, error } = await supabase
        .from("org_departments")
        .insert({ unit_key: unitKey, name: trimmedName })
        .select()
        .single();
      if (reportIfError(error, "יצירת המדור")) return;
      // Applied locally right away — see the same note on updateMember above. Unlike org_units,
      // org_departments' id is DB-generated, so the inserted row is read back via .select().
      if (data) {
        const row = data as OrgDepartmentRow;
        setOrgDeptRows((prev) => (prev.some((d) => d.id === row.id) ? prev : [...prev, row]));
      }
      showToast(`המדור "${trimmedName}" נוצר בהצלחה`);
    })();
  }, [reportIfError, showToast]);

  const addCategory: TaskStoreValue["addCategory"] = useCallback((userId, name, color) => {
    (async () => {
      const trimmedName = name.trim();
      const mine = categoriesRef.current.filter((c) => c.userId === userId);
      const sortOrder = mine.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
      const { data, error } = await supabase
        .from("user_categories")
        .insert({ user_id: userId, name: trimmedName, color, sort_order: sortOrder })
        .select()
        .single();
      if (reportIfError(error, "יצירת הקטגוריה")) return;
      // Applied locally right away — see the same note on updateMember above.
      if (data) {
        const c = categoryFromRow(data as CategoryRow);
        setCategories((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
      }
    })();
  }, [reportIfError]);

  const updateCategory: TaskStoreValue["updateCategory"] = useCallback((id, patch) => {
    (async () => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name.trim();
      if (patch.color !== undefined) dbPatch.color = patch.color;
      if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;
      const { error } = await supabase.from("user_categories").update(dbPatch).eq("id", id);
      if (reportIfError(error, "עדכון הקטגוריה")) return;
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch, name: patch.name?.trim() ?? c.name } : c))
      );
    })();
  }, [reportIfError]);

  const removeCategory: TaskStoreValue["removeCategory"] = useCallback((id) => {
    (async () => {
      const { error } = await supabase.from("user_categories").delete().eq("id", id);
      if (reportIfError(error, "מחיקת הקטגוריה")) return;
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setTaskCategories((prev) => Object.fromEntries(Object.entries(prev).filter(([, cid]) => cid !== id)));
    })();
  }, [reportIfError]);

  const setTaskCategory: TaskStoreValue["setTaskCategory"] = useCallback((taskId, userId, categoryId) => {
    (async () => {
      const key = taskCategoryKey(taskId, userId);
      const { error } = categoryId
        ? await supabase
            .from("task_category_assignments")
            .upsert({ task_id: taskId, user_id: userId, category_id: categoryId }, { onConflict: "task_id,user_id" })
        : await supabase.from("task_category_assignments").delete().eq("task_id", taskId).eq("user_id", userId);
      if (reportIfError(error, "שיוך הקטגוריה")) return;
      setTaskCategories((prev) => {
        const next = { ...prev };
        if (categoryId) next[key] = categoryId;
        else delete next[key];
        return next;
      });
    })();
  }, [reportIfError]);

  const saveTaskSteps: TaskStoreValue["saveTaskSteps"] = useCallback((taskId, baseline, draft, actorId) => {
    (async () => {
      // Diffed against what the sheet saw when it opened (baseline), NOT the live list — so saving
      // only applies this person's own edits and never reverts a step someone else changed meanwhile.
      const existing = baseline.filter((s): s is StepDraft & { id: string } => Boolean(s.id));
      const existingById = new Map(existing.map((s, i) => [s.id, { ...s, sortOrder: i }]));
      const errors: ({ message: string } | null)[] = [];

      const removedIds = existing.filter((s) => !draft.some((d) => d.id === s.id)).map((s) => s.id);
      if (removedIds.length > 0) {
        errors.push((await supabase.from("task_steps").delete().in("id", removedIds)).error);
      }

      const now = new Date().toISOString();
      const inserts: Record<string, unknown>[] = [];
      const updates: PromiseLike<{ error: { message: string } | null }>[] = [];
      draft.forEach((d, i) => {
        const before = d.id ? existingById.get(d.id) : undefined;
        if (!before) {
          inserts.push({
            task_id: taskId,
            title: d.title.trim(),
            sort_order: i,
            is_done: d.isDone,
            done_by: d.isDone ? actorId : null,
            done_at: d.isDone ? now : null,
          });
          return;
        }
        const structural: Record<string, unknown> = {};
        if (d.title.trim() !== before.title) structural.title = d.title.trim();
        if (before.sortOrder !== i) structural.sort_order = i;
        if (Object.keys(structural).length > 0) {
          updates.push(supabase.from("task_steps").update(structural).eq("id", before.id));
        }
        // Done-state changes are conditional on the row still being in the state we saw, so two
        // people finishing the same step at once don't overwrite each other's "who & when".
        if (d.isDone && !before.isDone) {
          updates.push(
            supabase.from("task_steps").update({ is_done: true, done_by: actorId, done_at: now }).eq("id", before.id).eq("is_done", false)
          );
        } else if (!d.isDone && before.isDone) {
          updates.push(
            supabase.from("task_steps").update({ is_done: false, done_by: null, done_at: null }).eq("id", before.id).eq("is_done", true)
          );
        }
      });
      if (inserts.length > 0) errors.push((await supabase.from("task_steps").insert(inserts)).error);
      for (const res of await Promise.all(updates)) errors.push(res.error);

      // Re-read the task's steps so local state matches exactly what the DB ended up with.
      const { data } = await supabase.from("task_steps").select("*").eq("task_id", taskId).order("sort_order");
      if (data) setStepsByTask((prev) => ({ ...prev, [taskId]: (data as StepRow[]).map(stepFromRow) }));
      if (reportIfError(errors.find(Boolean) ?? null, "שמירת השלבים")) return;

      // One activity entry per save (not one per step), so a long checklist doesn't flood the feed.
      const newlyDone = draft.filter((d) => d.isDone && !(d.id && existingById.get(d.id)?.isDone)).length;
      if (newlyDone > 0) {
        const doneCount = draft.filter((d) => d.isDone).length;
        const task = rawTasksRef.current.find((t) => t.id === taskId);
        await logActivity({
          userId: actorId,
          taskId,
          taskTitle: task?.title ?? "",
          action:
            doneCount === draft.length
              ? `השלים/ה את כל השלבים (${draft.length})`
              : `התקדם/ה בשלבים (${doneCount}/${draft.length})`,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportIfError, logActivity]);

  const setStepDone: TaskStoreValue["setStepDone"] = useCallback((taskId, stepId, done, actorId) => {
    (async () => {
      const now = new Date().toISOString();
      // Local first — the realtime echo for task_steps can lag or not arrive, and the point of this
      // action is that the tick shows (and survives closing the sheet) immediately.
      setStepsByTask((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] ?? []).map((s) =>
          s.id === stepId
            ? { ...s, isDone: done, doneBy: done ? actorId : undefined, doneAt: done ? now : undefined }
            : s
        ),
      }));

      // Conditional on the row still being in the state the UI saw, so two people finishing the same
      // step at once don't overwrite each other's "who & when" (same guard as saveTaskSteps).
      const patch = done
        ? { is_done: true, done_by: actorId, done_at: now }
        : { is_done: false, done_by: null, done_at: null };
      const { data: changed, error } = await supabase
        .from("task_steps")
        .update(patch)
        .eq("id", stepId)
        .eq("is_done", !done)
        .select("id");

      // Re-read so local state matches exactly what the DB ended up with (also undoes the optimistic
      // change if the write failed or someone else got there first).
      const { data: fresh } = await supabase.from("task_steps").select("*").eq("task_id", taskId).order("sort_order");
      if (fresh) setStepsByTask((prev) => ({ ...prev, [taskId]: (fresh as StepRow[]).map(stepFromRow) }));
      if (reportIfError(error, "שמירת השלב")) return;
      if (!changed || changed.length === 0) return; // already in that state — nothing new to log

      if (done && fresh) {
        const total = fresh.length;
        const doneCount = (fresh as StepRow[]).filter((s) => s.is_done).length;
        const task = rawTasksRef.current.find((t) => t.id === taskId);
        await logActivity({
          userId: actorId,
          taskId,
          taskTitle: task?.title ?? "",
          action: doneCount === total ? `השלים/ה את כל השלבים (${total})` : `התקדם/ה בשלבים (${doneCount}/${total})`,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportIfError, logActivity]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const getTaskCategory = useCallback(
    (taskId: string, userId: string) => {
      const categoryId = taskCategories[taskCategoryKey(taskId, userId)];
      return categoryId ? categories.find((c) => c.id === categoryId) : undefined;
    },
    [taskCategories, categories]
  );

  const tasks = useMemo<Task[]>(
    () =>
      rawTasks.map((t) => ({
        ...t,
        comments: commentsByTask[t.id] ?? [],
        attachments: attachmentsByTask[t.id] ?? [],
        steps: [...(stepsByTask[t.id] ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
      })),
    [rawTasks, commentsByTask, attachmentsByTask, stepsByTask]
  );

  // Joins the two flat DB-shaped row lists into the app's OrgUnit[] shape. Falls back to the
  // original hardcoded seed list only if the DB hasn't returned anything yet (e.g. very first
  // paint) — once loaded, this is always the live, super-admin-editable list.
  const orgUnits = useMemo<OrgUnit[]>(() => {
    if (orgUnitRows.length === 0) return SEED_ORG_UNITS;
    return orgUnitRows.map((u) => ({
      key: u.key,
      label: u.label,
      departments: orgDeptRows.filter((d) => d.unit_key === u.key).map((d) => d.name),
    }));
  }, [orgUnitRows, orgDeptRows]);

  // Every action function above is now stable (useCallback + refs for live data),
  // so this only needs to change when the actual DATA changes — not on every render.
  const value = useMemo(
    () => ({
      loading, tasks, activity, team, orgUnits, categories: sortedCategories, createTasks, updateTask, deleteTask, addComment,
      addAttachment, removeAttachment, addMember, updateMember, removeMember, addOrgUnit, addOrgDepartment,
      addCategory, updateCategory, removeCategory, setTaskCategory, getTaskCategory,
      saveTaskSteps, setStepDone,
    }),
    [loading, tasks, activity, team, orgUnits, sortedCategories, createTasks, updateTask, deleteTask, addComment,
      addAttachment, removeAttachment, addMember, updateMember, removeMember, addOrgUnit, addOrgDepartment,
      addCategory, updateCategory, removeCategory, setTaskCategory, getTaskCategory,
      saveTaskSteps, setStepDone]
  );

  return <TaskStoreContext.Provider value={value}>{children}</TaskStoreContext.Provider>;
}

export function useTaskStore() {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) throw new Error("useTaskStore must be used within a TaskStoreProvider");
  return ctx;
}
