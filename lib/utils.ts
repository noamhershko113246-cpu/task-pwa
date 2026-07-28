import { TeamMember, Task, STATUS_LABELS, PRIORITY_COLORS } from "./types";

/** Builds a CSV file from tasks (Excel-compatible) and triggers a browser download. */
export function exportTasksToCsv(tasks: Task[], team: TeamMember[], filename = "משימות.csv") {
  const findName = (id: string) => team.find((m) => m.id === id)?.name ?? id;
  const headers = ["שם המשימה", "תיאור", "אחראי/ת", "דדליין", "סטטוס", "דחיפות"];

  const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const rows = tasks.map((t) =>
    [
      t.title,
      t.description,
      t.assigneeIds.map(findName).join(", "),
      t.deadline ? new Date(t.deadline).toLocaleString("he-IL") : "ללא דדליין",
      STATUS_LABELS[t.status],
      `${t.priority} - ${PRIORITY_COLORS[t.priority].label}`,
    ]
      .map(escapeCell)
      .join(",")
  );

  // BOM so Excel opens Hebrew UTF-8 correctly
  const csv = "\uFEFF" + [headers.map(escapeCell).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function timeAgoHebrew(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "עכשיו";
  if (min < 60) return `לפני ${min} דקות`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} שעות`;
  const days = Math.floor(hr / 24);
  return `לפני ${days} ימים`;
}

export function isToday(dateIso: string | null): boolean {
  if (!dateIso) return false;
  const d = new Date(dateIso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function isOverdue(deadline: string | null, status: string): boolean {
  if (!deadline || status === "done" || status === "cancelled") return false;
  // deadline now carries a real time-of-day, so compare it directly instead
  // of forcing everything to end-of-day.
  return new Date(deadline).getTime() < Date.now();
}

/** Local (not UTC) YYYY-MM-DD key — used to group/compare tasks by calendar day regardless of their time-of-day. */
export function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const WEEKDAY_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]; // index = Date.getDay()

/** Generates one ISO date per matching weekday between start and end (inclusive). Capped at 104 instances as a safety limit. */
export function generateRecurringDates(
  startIso: string,
  endIso: string,
  selectedDays: Set<number>
): string[] {
  const dates: string[] = [];
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || selectedDays.size === 0) return dates;

  // every instance keeps the same time-of-day as the anchor deadline
  const hours = start.getHours();
  const minutes = start.getMinutes();
  end.setHours(23, 59, 59, 999); // include the whole end day regardless of its time

  const cursor = new Date(start);
  cursor.setHours(hours, minutes, 0, 0);
  while (cursor.getTime() <= end.getTime() && dates.length < 104) {
    if (selectedDays.has(cursor.getDay())) {
      dates.push(cursor.toISOString());
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Groups a month's tasks by assignee (category = team member), in team order, dropping empty categories. */
export function groupTasksByMemberInMonth<T extends { deadline: string | null; assigneeIds: string[] }>(
  tasks: T[],
  monthDate: Date,
  team: TeamMember[]
): { member: TeamMember; items: T[] }[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const inMonth = tasks.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  return team
    .map((member) => ({
      member,
      items: inMonth
        .filter((t) => t.assigneeIds.includes(member.id))
        .sort((a, b) => ((a.deadline as string) < (b.deadline as string) ? 1 : -1)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Converts an ISO timestamp to the "YYYY-MM-DDTHH:mm" format a datetime-local input expects, in local time. */
export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDeadline(iso: string | null): string {
  if (!iso) return "ללא דדליין";
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  const timePart = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return `${datePart}, ${timePart}`;
}

/** Sorts by deadline descending (latest first); tasks with no deadline always sort last. */
export function compareByDeadlineDesc(a: { deadline: string | null }, b: { deadline: string | null }): number {
  if (!a.deadline && !b.deadline) return 0;
  if (!a.deadline) return 1;
  if (!b.deadline) return -1;
  return a.deadline < b.deadline ? 1 : -1;
}

/** Tasks that still count toward completion metrics — cancelled tasks are excluded entirely. */
export function activeTasks<T extends { status: string }>(tasks: T[]): T[] {
  return tasks.filter((t) => t.status !== "cancelled");
}

/** Completion percentage among active (non-cancelled) tasks only, so cancelling a task never drags the number down. */
export function completionPercent(tasks: { status: string }[]): number {
  const active = activeTasks(tasks);
  if (active.length === 0) return 0;
  const done = active.filter((t) => t.status === "done").length;
  return (done / active.length) * 100;
}

export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

/** Returns tasks whose deadline falls within the given month/year, grouped by day (desc). */
export function groupTasksByDayInMonth<T extends { deadline: string | null }>(
  tasks: T[],
  monthDate: Date
): { dateIso: string; items: T[] }[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const inMonth = tasks.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const groups = new Map<string, T[]>();
  for (const task of inMonth) {
    const key = localDateKey(task.deadline as string);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(task);
  }

  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateIso, items]) => ({ dateIso, items }));
}
