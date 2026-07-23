"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useRef } from "react";
import { Task, ActivityEvent, TeamMember, Comment, TaskStatus, Priority } from "./types";
import { supabase } from "./supabase";

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
  deadline: string;
  status: TaskStatus;
  priority: Priority;
  recurrence_id: string | null;
  previous_status: TaskStatus | null;
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
  removeMember: (id: string) => void;
}

const TaskStoreContext = createContext<TaskStoreValue | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [rawTasks, setRawTasks] = useState<Omit<Task, "comments">[]>([]);
  const [commentsByTask, setCommentsByTask] = useState<Record<string, Comment[]>>({});
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const teamRef = useRef<TeamMember[]>([]);
  teamRef.current = team;

  const findMember = (id: string) => teamRef.current.find((m) => m.id === id);

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

  const logActivity = async (event: Omit<ActivityEvent, "id" | "timestamp">) => {
    await supabase.from("activity_log").insert({
      user_id: event.userId || null,
      task_id: event.taskId || null,
      task_title: event.taskTitle,
      action: event.action,
    });
  };

  const createTasks: TaskStoreValue["createTasks"] = (newTasks) => {
    (async () => {
      const rows = newTasks.map((t) => ({
        title: t.title,
        description: t.description,
        assignee_ids: t.assigneeIds,
        deadline: t.deadline,
        priority: t.priority,
        recurrence_id: t.recurrenceId ?? null,
        status: "todo",
      }));
      const { data } = await supabase.from("tasks").insert(rows).select();
      if (data) {
        for (const row of data as TaskRow[]) {
          const names = row.assignee_ids.map((id) => findMember(id)?.name ?? "").filter(Boolean).join(", ");
          await logActivity({
            userId: row.assignee_ids[0] ?? "",
            taskId: row.id,
            taskTitle: row.title,
            action: `נוצרה משימה חדשה עבור ${names}`,
          });
        }
      }
    })();
  };

  const updateTask: TaskStoreValue["updateTask"] = (id, patch) => {
    (async () => {
      const dbPatch: Record<string, unknown> = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.description !== undefined) dbPatch.description = patch.description;
      if (patch.assigneeIds !== undefined) dbPatch.assignee_ids = patch.assigneeIds;
      if (patch.deadline !== undefined) dbPatch.deadline = patch.deadline;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.priority !== undefined) dbPatch.priority = patch.priority;
      if (patch.previousStatus !== undefined) dbPatch.previous_status = patch.previousStatus;
      await supabase.from("tasks").update(dbPatch).eq("id", id);
      // A status change to 'done' is the trigger point for a future WhatsApp/SMS
      // automation to the manager — same pipeline documented for monday.com earlier.
    })();
  };

  const deleteTask: TaskStoreValue["deleteTask"] = (id, scope) => {
    (async () => {
      if (scope === "series") {
        const target = rawTasks.find((t) => t.id === id);
        if (target?.recurrenceId) {
          await supabase.from("tasks").delete().eq("recurrence_id", target.recurrenceId);
          return;
        }
      }
      await supabase.from("tasks").delete().eq("id", id);
    })();
  };

  const addComment: TaskStoreValue["addComment"] = (taskId, userId, text) => {
    (async () => {
      const commenter = findMember(userId);
      const task = rawTasks.find((t) => t.id === taskId);
      await supabase.from("task_comments").insert({ task_id: taskId, user_id: userId, text });
      await logActivity({ userId, taskId, taskTitle: task?.title ?? "", action: `${commenter?.isManager ? "הוסיפה" : "הוסיף/ה"} הערה` });
      // In production this is also the moment to fire a push/WhatsApp
      // notification directly to the manager, not just log an activity row.
    })();
  };

  const addMember: TaskStoreValue["addMember"] = (name, phone) => {
    (async () => {
      const [colorFrom, colorTo] = AVATAR_COLORS[team.length % AVATAR_COLORS.length];
      await supabase.from("team_members").insert({
        name: name.trim(),
        initials: name.trim().slice(0, 2),
        color_from: colorFrom,
        color_to: colorTo,
        phone,
      });
    })();
  };

  const removeMember: TaskStoreValue["removeMember"] = (id) => {
    (async () => {
      // assignee_ids is a plain array column now (no FK cascade), so we clean it
      // up ourselves: drop this person from any shared task, and delete tasks
      // that would be left with no assignee at all.
      const { data: affected } = await supabase
        .from("tasks")
        .select("id, assignee_ids")
        .contains("assignee_ids", [id]);

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

      await supabase.from("team_members").delete().eq("id", id);
    })();
  };

  const tasks = useMemo<Task[]>(
    () => rawTasks.map((t) => ({ ...t, comments: commentsByTask[t.id] ?? [] })),
    [rawTasks, commentsByTask]
  );

  const value = useMemo(
    () => ({ loading, tasks, activity, team, createTasks, updateTask, deleteTask, addComment, addMember, removeMember }),
    [loading, tasks, activity, team]
  );

  return <TaskStoreContext.Provider value={value}>{children}</TaskStoreContext.Provider>;
}

export function useTaskStore() {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) throw new Error("useTaskStore must be used within a TaskStoreProvider");
  return ctx;
}
