export type TaskStatus = "todo" | "in_progress" | "stuck" | "done" | "cancelled";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "לביצוע",
  in_progress: "בביצוע",
  stuck: "תקוע",
  done: "הושלם",
  cancelled: "בוטלה",
};

export type Priority = 1 | 2 | 3 | 4 | 5; // 1 = most urgent (red) ... 5 = least urgent (green)

export const PRIORITY_COLORS: Record<Priority, { bg: string; fg: string; label: string }> = {
  1: { bg: "#fee2e2", fg: "#b91c1c", label: "דחוף מאוד" },
  2: { bg: "#ffedd5", fg: "#c2410c", label: "דחוף" },
  3: { bg: "#fef9c3", fg: "#a16207", label: "רגיל" },
  4: { bg: "#ecfccb", fg: "#4d7c0f", label: "לא דחוף" },
  5: { bg: "#dcfce7", fg: "#15803d", label: "אפשר להמתין" },
};

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  colorFrom: string; // tailwind gradient stop, e.g. "from-indigo-400"
  colorTo: string; // e.g. "to-indigo-600"
  isManager?: boolean;
  isSuperManager?: boolean; // manages the manager(s) too — sees/edits literally everyone
  phone: string; // used for phone-number login — each person signs into their own account only
  loginKeyword?: string; // special-case login (e.g. a name typed instead of a phone number)
}

/** Access tier used to decide who can view/edit whose tasks. Higher outranks lower. */
export function memberRank(m: Pick<TeamMember, "isManager" | "isSuperManager">): number {
  if (m.isSuperManager) return 2;
  if (m.isManager) return 1;
  return 0;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: string; // ISO
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeIds: string[]; // can be shared by several people at once
  deadline: string; // ISO date
  status: TaskStatus;
  createdAt: string;
  priority: Priority;
  recurrenceId?: string; // groups instances generated from one recurring task
  previousStatus?: TaskStatus; // used to support "undo complete"
  comments?: Comment[];
}

export interface ActivityEvent {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  action: string; // e.g. "העביר את המשימה" | "סימן כהושלם"
  timestamp: string; // ISO
}
