"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode, useRef } from "react";
import { Task, ActivityEvent, TeamMember, Comment, TaskStatus, Priority, STATUS_LABELS } from "./types";
import { supabase } from "./supabase";
import { useToast } from "@/components/ToastProvider";

const AVATAR_COLORS: [string, string][] = [
  ["from-sky-400", "to-sky-600"],
  ["from-rose-400", "to-rose-600"],
  ["from-amber-400", "to-amber-600"],
  ["from-emerald-400", "to-emerald-600"],
  ["from-violet-400", "to-violet-600"],
  ["from-cyan-400", "to-cyan-600"],
  ["from-fuchsia-400", "to-fuchsia-600"],
  ["from-lime-400", "to-lime-600"],
];

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

interface ActivityRow {
  id: string;
  user_id: string | null;
  task_id: string | null;
  task_title: string;
  action: string;
  created_at: string;
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

function activityFromRow(r: ActivityRow): ActivityEvent {
  return { id: r.id, userId: r.user_id ?? "", taskId: r.task_id ?? "", taskTitle: r.task_title, action: r.action, timestamp: r.created_at };
}

interface TaskStoreValue {
  loading: boolean;
  tasks: Task[];
  activity: ActivityEvent[];
  team: TeamMember[];
  createTasks: (newTasks: Omit<Task, "id" | "createdAt" | "status">[]) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string, scope: "one" | "series") => void;
  addComment: (taskId: string, userId: string, text: string) => void;
  addMember: (name: string, phone: string) => void;
  updateMember: (id: string, patch: { name?: string; phone?: string }) => void;
  removeMember: (id: string) => void;
}

const TaskStoreContext = createContext<TaskStoreValue | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [rawTasks, setRawTasks] = useState<Omit<Task, "comments">[]>([]);
  const [commentsByTask, setCommentsByTask] = useState<Record<string, Comment[]>>({});
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
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
      const [teamRes, tasksRes, commentsRes, activityRes] = await Promise.all([
        supabase.from("team_members").select("*").order("created_at"),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("task_comments").select("*").order("created_at"),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100),
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
      if (activityRes.data) setActivity((activityRes.data as ActivityRow[]).map(activityFromRow));
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        const a = activityFromRow(payload.new as ActivityRow);
        setActivity((prev) => [a, ...prev]);
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
    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, title, body, url }),
    }).catch(() => {
      // push is best-effort — a failed send should never break the app (and doesn't need its own error toast)
    });
  }, []);

  const createTasks: TaskStoreValue["createTasks"] = useCallback((newTasks) => {
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
        showToast(createdRows.length > 1 ? `${createdRows.length} משימות נוצרו בהצלחה` : "המשימה נוצרה בהצלחה");

        // Build every activity_log row up front and insert them all in one request,
        // instead of one `await` per task (which was serial and slow for recurring batches).
        const activityRows = createdRows.map((row) => {
          const names = row.assignee_ids.map((id) => findMember(id)?.name ?? "").filter(Boolean).join(", ");
          const creator = row.created_by ? findMember(row.created_by) : undefined;
          return {
            user_id: row.created_by || row.assignee_ids[0] || null,
            task_id: row.id,
            task_title: row.title,
            action: `${creator?.isManager ? "יצרה" : "יצר/ה"} משימה עבור ${names}`,
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

  const updateTask: TaskStoreValue["updateTask"] = useCallback((id, patch) => {
    (async () => {
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

      if (patch.status !== undefined) {
        const task = rawTasksRef.current.find((t) => t.id === id);
        const managerIds = teamRef.current.filter((m) => m.isManager).map((m) => m.id);
        if (task) {
          sendPush(
            managerIds,
            "עדכון סטטוס במשימה",
            `"${task.title}" עודכנה ל: ${STATUS_LABELS[patch.status]}`,
            "/manager"
          );
        }
      }
    })();
  }, [sendPush, reportIfError]);

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
      await logActivity({ userId, taskId, taskTitle: task?.title ?? "", action: `${commenter?.isManager ? "הוסיפה" : "הוסיף/ה"} הערה` });
      if (task) {
        const managerIds = teamRef.current.filter((m) => m.isManager && m.id !== userId).map((m) => m.id);
        sendPush(managerIds, `הערה חדשה מ${commenter?.name ?? ""}`, `"${task.title}": ${text}`, "/manager");
      }
    })();
  }, [findMember, logActivity, sendPush, reportIfError]);

  const addMember: TaskStoreValue["addMember"] = useCallback((name, phone) => {
    (async () => {
      const [colorFrom, colorTo] = AVATAR_COLORS[teamRef.current.length % AVATAR_COLORS.length];
      const { error } = await supabase.from("team_members").insert({
        name: name.trim(),
        initials: name.trim().slice(0, 2),
        color_from: colorFrom,
        color_to: colorTo,
        phone,
      });
      if (reportIfError(error, "הוספת החייל/ת")) return;
      showToast(`${name.trim()} נוסף/ה בהצלחה לצוות`);
    })();
  }, [reportIfError, showToast]);

  const updateMember: TaskStoreValue["updateMember"] = useCallback((id, patch) => {
    (async () => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) {
        dbPatch.name = patch.name.trim();
        dbPatch.initials = patch.name.trim().slice(0, 2);
      }
      if (patch.phone !== undefined) dbPatch.phone = patch.phone.trim();
      const { error } = await supabase.from("team_members").update(dbPatch).eq("id", id);
      if (reportIfError(error, "עדכון הפרטים")) return;
      showToast("הפרטים עודכנו בהצלחה");
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

  const tasks = useMemo<Task[]>(
    () => rawTasks.map((t) => ({ ...t, comments: commentsByTask[t.id] ?? [] })),
    [rawTasks, commentsByTask]
  );

  // Every action function above is now stable (useCallback + refs for live data),
  // so this only needs to change when the actual DATA changes — not on every render.
  const value = useMemo(
    () => ({ loading, tasks, activity, team, createTasks, updateTask, deleteTask, addComment, addMember, updateMember, removeMember }),
    [loading, tasks, activity, team, createTasks, updateTask, deleteTask, addComment, addMember, updateMember, removeMember]
  );

  return <TaskStoreContext.Provider value={value}>{children}</TaskStoreContext.Provider>;
}

export function useTaskStore() {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) throw new Error("useTaskStore must be used within a TaskStoreProvider");
  return ctx;
}
