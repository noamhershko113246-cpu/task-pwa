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
  avatarUrl?: string | null; // uploaded profile photo (Supabase Storage "avatars" bucket) — shown instead of the initials/gradient circle when set
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
  department?: string; // e.g. 'משא"ן' (HR) or 'טנ"א' (Maintenance) — a department NAME, repeated across units on purpose (see brigade below)
  brigade: string; // the unit, e.g. "חטיבה 14" or HQ_UNIT ('מפא"ג') — required (see lib/orgStructure.ts). Isolation is by the (brigade, department) PAIR, not department alone: 'משא"ן' of חטיבה 14 and 'משא"ן' of מפא"ג share a name but are fully separate, isolated department instances
  isSuperAdmin?: boolean; // system-wide override: bypasses department isolation AND rank entirely — sees/manages every unit, every rank, no exceptions. Distinct from isSuperManager (which is scoped to one department).
  title?: string | null; // display-only job title, e.g. "קצינת סגל" — purely descriptive, does not affect permissions or visibility
  proxyIds?: string[]; // "stand-in" grant: these team_member ids may create/manage tasks for THIS person and open their /staff page, regardless of rank (e.g. a soldier standing in for her own manager). Granted self-service by this person, e.g. in Settings — not by whoever receives the access.
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
 * within her own department/unit — plus anyone who has explicitly granted her
 * "stand-in" (proxy) access to their own account, rank notwithstanding.
 *   - super-admin (isSuperAdmin) → the entire team, full stop. No department
 *     wall, no rank ceiling — this is the one tier that spans every unit.
 *   - department instance (brigade + department, e.g. 'משא"ן of חטיבה 14') → otherwise a hard
 *     wall first: nobody outside the viewer's own (brigade, department) PAIR is ever visible,
 *     super-manager and proxy grants included. Department names repeat across units on purpose
 *     ('משא"ן' of מפא"ג and 'משא"ן' of חטיבה 14 are two separate instances that share a name) —
 *     so brigade is part of the wall, not just department. Unset department = DEFAULT_DEPARTMENT,
 *     so every member who predates this field keeps exactly today's behavior.
 *   - proxy ("ממלא/ת מקום") → anyone in her department who listed her in their
 *     OWN proxyIds is visible too, regardless of rank in either direction —
 *     e.g. a soldier a manager explicitly trusted to stand in for him. This is
 *     the one relationship that isn't derived from rank/managerId at all: it's
 *     granted self-service by the target, one person at a time.
 *   - super-manager (קמשא) → everyone in her department, regardless of managerId
 *   - manager (מפקדת) → herself + soldiers ranked below her, in her department,
 *     whose managerId is either unset (visible to every manager in the
 *     department — the pre-existing default, so nobody who already existed
 *     before managerId was introduced changes visibility) or equals her own id
 *     (assigned specifically to her)
 *   - soldier (חייל/ת) → only themselves (plus any proxy grants, above)
 */
export function getVisibleScope(viewer: TeamMember, team: TeamMember[]): TeamMember[] {
  if (viewer.isSuperAdmin) return team;
  const myRank = memberRank(viewer);
  const myDept = viewer.department ?? DEFAULT_DEPARTMENT;
  const myBrigade = viewer.brigade;
  const sameDept = (m: TeamMember) =>
    (m.department ?? DEFAULT_DEPARTMENT) === myDept && m.brigade === myBrigade;
  const rankBased = viewer.isSuperManager
    ? team.filter((m) => m.id === viewer.id || (memberRank(m) < myRank && sameDept(m)))
    : team.filter(
        (m) =>
          m.id === viewer.id ||
          (memberRank(m) < myRank && sameDept(m) && (!m.managerId || m.managerId === viewer.id))
      );
  const proxyTargets = team.filter((m) => sameDept(m) && (m.proxyIds ?? []).includes(viewer.id));
  if (proxyTargets.length === 0) return rankBased;
  const seen = new Set(rankBased.map((m) => m.id));
  return [...rankBased, ...proxyTargets.filter((m) => !seen.has(m.id))];
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: string; // ISO
}

export interface Attachment {
  id: string;
  taskId: string;
  uploadedBy?: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
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
  attachments?: Attachment[];
}

export interface ActivityEvent {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  action: string; // e.g. "העביר את המשימה" | "סימן כהושלם"
  timestamp: string; // ISO
}
