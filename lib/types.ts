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

/** Every existing member predates the department field, so this is what "unset" means: the original HR team. */
export const DEFAULT_DEPARTMENT = 'משא"ן';

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
  dailySummaryEnabled?: boolean; // opt-in daily push reminder about open tasks
  dailySummaryTime?: string | null; // "HH:MM" 24h, Asia/Jerusalem local time
  dailySummaryScope?: "all" | "due_soon"; // which open tasks count toward the reminder
  backgroundUrl?: string | null; // custom app-background image (Supabase Storage "backgrounds" bucket), null = default
  backgroundPreset?: string | null; // key into BACKGROUND_PRESETS (lib/backgroundPresets.ts); ignored if backgroundUrl is set
  workingHoursEnabled?: boolean; // opt-in: hold deadline reminders outside this window (Sun–Thu)
  workingHoursStart?: string | null; // "HH:MM" 24h, Asia/Jerusalem local time
  workingHoursEnd?: string | null; // "HH:MM" 24h, Asia/Jerusalem local time
  overdueReminderIntervalMinutes?: number; // how often a still-open overdue task re-pings this person; 1440 = once a day
  managerId?: string | null; // direct manager's id; null/unset = visible to every manager (pre-existing default). A super-manager always sees everyone regardless of this.
  canAddMembers?: boolean; // narrow permission: lets a non-manager add new team members from the app, without granting manager-level visibility into anyone else's tasks
  department?: string; // e.g. 'משא"ן' (HR, the original/default team) or 'טנ"א' (Maintenance) — isolates each unit's people and tasks from every other unit
  brigade?: string | null; // display-only sub-unit, e.g. "חטיבה 14" — does not affect visibility, department is what isolates
  isSuperAdmin?: boolean; // system-wide override: bypasses department isolation AND rank entirely — sees/manages every unit, every rank, no exceptions. Distinct from isSuperManager (which is scoped to one department).
}

/** Access tier used to decide who can view/edit whose tasks. Higher outranks lower. */
export function memberRank(m: Pick<TeamMember, "isManager" | "isSuperManager">): number {
  if (m.isSuperManager) return 2;
  if (m.isManager) return 1;
  return 0;
}

/**
 * The set of people a given viewer may assign tasks to and see the tasks of:
 * themselves, plus everyone ranked strictly below them who reports to her,
 * within her own department/unit.
 *   - super-admin (isSuperAdmin) → the entire team, full stop. No department
 *     wall, no rank ceiling — this is the one tier that spans every unit.
 *   - department (משא"ן / טנ"א / ...) → otherwise a hard wall first: nobody outside the
 *     viewer's own department is ever visible, super-manager included. Each
 *     unit is its own isolated workspace. Unset department = DEFAULT_DEPARTMENT,
 *     so every member who predates this field keeps exactly today's behavior.
 *   - super-manager (קמשא) → everyone in her department, regardless of managerId
 *   - manager (מפקדת) → herself + soldiers ranked below her, in her department,
 *     whose managerId is either unset (visible to every manager in the
 *     department — the pre-existing default, so nobody who already existed
 *     before managerId was introduced changes visibility) or equals her own id
 *     (assigned specifically to her)
 *   - soldier (חייל/ת) → only themselves
 */
export function getVisibleScope(viewer: TeamMember, team: TeamMember[]): TeamMember[] {
  if (viewer.isSuperAdmin) return team;
  const myRank = memberRank(viewer);
  const myDept = viewer.department ?? DEFAULT_DEPARTMENT;
  const sameDept = (m: TeamMember) => (m.department ?? DEFAULT_DEPARTMENT) === myDept;
  if (viewer.isSuperManager) {
    return team.filter((m) => m.id === viewer.id || (memberRank(m) < myRank && sameDept(m)));
  }
  return team.filter(
    (m) =>
      m.id === viewer.id ||
      (memberRank(m) < myRank && sameDept(m) && (!m.managerId || m.managerId === viewer.id))
  );
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
  createdBy?: string; // who assigned it — a manager, super-manager, or the soldier themselves
  deadline: string | null; // ISO timestamp — null means no deadline
  status: TaskStatus;
  createdAt: string;
  priority: Priority;
  recurrenceId?: string; // groups instances generated from one recurring task
  previousStatus?: TaskStatus; // used to support "undo complete"
  completedAt?: string; // ISO timestamp — set when status becomes "done", cleared otherwise
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
