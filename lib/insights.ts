import { Task } from "./types";
import { isOverdue } from "./utils";

export interface Bottleneck {
  task: Task;
  reason: string;
}

export interface TriageResult {
  bottlenecks: Bottleneck[];
  topPriorities: Task[];
  headline: string;
}

const STUCK_DAYS_THRESHOLD = 2;

/**
 * Lightweight, fully local heuristic analysis (no external AI call) — runs instantly,
 * costs nothing, and needs no API key. Scans open tasks for bottlenecks and ranks
 * the top few that deserve attention today.
 */
export function analyzeTasks(tasks: Task[]): TriageResult {
  const open = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");

  const scored: (Bottleneck & { weight: number })[] = [];
  for (const task of open) {
    const ageDays = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const overdue = isOverdue(task.deadline, task.status);
    if (task.status === "stuck") {
      scored.push({ task, reason: "המשימה מסומנת כתקועה", weight: 3 });
    } else if (overdue) {
      scored.push({ task, reason: "עברה את מועד הדדליין", weight: 2.5 });
    } else if (task.status === "in_progress" && ageDays >= STUCK_DAYS_THRESHOLD) {
      scored.push({ task, reason: `בביצוע כבר ${Math.floor(ageDays)} ימים ללא סיום`, weight: 1 + ageDays / 10 });
    }
  }
  const bottlenecks = scored
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map(({ task, reason }) => ({ task, reason }));

  const topPriorities = [...open]
    .sort((a, b) => {
      const aOverdue = isOverdue(a.deadline, a.status);
      const bOverdue = isOverdue(b.deadline, b.status);
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline < b.deadline ? -1 : 1;
    })
    .slice(0, 3);

  const headline =
    bottlenecks.length === 0
      ? "אין צווארי בקבוק כרגע — העבודה זורמת חלק 🎯"
      : `זיהיתי ${bottlenecks.length} משימות שתקועות ודורשות תשומת לב`;

  return { bottlenecks, topPriorities, headline };
}

export interface WrappedStats {
  hasData: boolean;
  mostProductiveDay: string | null;
  mostProductiveDayCount: number;
  avgCompletionHours: number | null;
  thisWeekCount: number;
  weeklyAverage: number;
  percentVsAverage: number;
}

const HEBREW_WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function startOfWeek(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

/** Aggregates "Spotify Wrapped"-style personal stats from completed tasks — all derived client-side from the store. */
export function computeWrappedStats(tasks: Task[]): WrappedStats {
  const done = tasks.filter((t) => t.status === "done" && t.completedAt);
  if (done.length === 0) {
    return {
      hasData: false,
      mostProductiveDay: null,
      mostProductiveDayCount: 0,
      avgCompletionHours: null,
      thisWeekCount: 0,
      weeklyAverage: 0,
      percentVsAverage: 0,
    };
  }

  const weekStart = startOfWeek(new Date());
  const thisWeekDone = done.filter((t) => new Date(t.completedAt as string) >= weekStart);

  const dayCounts = new Array(7).fill(0);
  for (const t of thisWeekDone) {
    dayCounts[new Date(t.completedAt as string).getDay()]++;
  }
  let bestDayIndex = -1;
  let bestDayCount = 0;
  dayCounts.forEach((count, i) => {
    if (count > bestDayCount) {
      bestDayCount = count;
      bestDayIndex = i;
    }
  });

  const totalHours = done.reduce((sum, t) => {
    const created = new Date(t.createdAt).getTime();
    const completed = new Date(t.completedAt as string).getTime();
    return sum + Math.max(0, completed - created) / (1000 * 60 * 60);
  }, 0);
  const avgCompletionHours = totalHours / done.length;

  // Baseline weekly average across the task's whole history, so this week has something to compare against.
  const earliest = done.reduce((min, t) => Math.min(min, new Date(t.createdAt).getTime()), Date.now());
  const weeksElapsed = Math.max(1, Math.ceil((Date.now() - earliest) / (1000 * 60 * 60 * 24 * 7)));
  const weeklyAverage = done.length / weeksElapsed;

  const percentVsAverage =
    weeklyAverage > 0 ? ((thisWeekDone.length - weeklyAverage) / weeklyAverage) * 100 : thisWeekDone.length > 0 ? 100 : 0;

  return {
    hasData: true,
    mostProductiveDay: bestDayIndex >= 0 ? HEBREW_WEEKDAYS[bestDayIndex] : null,
    mostProductiveDayCount: bestDayCount,
    avgCompletionHours,
    thisWeekCount: thisWeekDone.length,
    weeklyAverage,
    percentVsAverage,
  };
}
