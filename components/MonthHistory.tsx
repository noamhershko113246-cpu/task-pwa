"use client";

import { useMemo, useState } from "react";
import { CalendarX, SearchX } from "lucide-react";
import { Task, TeamMember, Priority } from "@/lib/types";
import { formatFullDate, groupTasksByDayInMonth, groupTasksByMemberInMonth } from "@/lib/utils";
import MonthSwitcher from "./MonthSwitcher";
import HistoryTaskRow from "./HistoryTaskRow";
import Avatar from "./Avatar";
import RoleBadge from "./RoleBadge";

export default function MonthHistory({
  tasks: allTasks,
  team,
  showAssignee = false,
  groupBy = "day",
  searchQuery = "",
  priorityFilter,
  onOpenTask,
}: {
  tasks: Task[];
  team: TeamMember[];
  showAssignee?: boolean;
  groupBy?: "day" | "member";
  searchQuery?: string;
  priorityFilter?: Set<Priority>;
  onOpenTask?: (task: Task) => void;
}) {
  const [month, setMonth] = useState(new Date());
  const isSearching = searchQuery.trim().length > 0;

  const tasks = useMemo(
    () => (priorityFilter && priorityFilter.size > 0 ? allTasks.filter((t) => priorityFilter.has(t.priority)) : allTasks),
    [allTasks, priorityFilter]
  );

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      .sort((a, b) => (a.deadline < b.deadline ? 1 : -1));
  }, [tasks, searchQuery, isSearching]);

  const dayGroups = useMemo(
    () => (!isSearching && groupBy === "day" ? groupTasksByDayInMonth(tasks, month) : []),
    [tasks, month, groupBy, isSearching]
  );
  const memberGroups = useMemo(
    () => (!isSearching && groupBy === "member" ? groupTasksByMemberInMonth(tasks, month, team) : []),
    [tasks, month, groupBy, team, isSearching]
  );

  if (isSearching) {
    return (
      <div className="space-y-2">
        {searchResults.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 dark:bg-zinc-800">
              <SearchX className="text-ink-soft dark:text-ink-dark-soft" size={26} strokeWidth={1.8} />
            </div>
            <p className="text-sm font-medium text-ink-soft dark:text-ink-dark-soft">לא נמצאו משימות תואמות</p>
          </div>
        ) : (
          searchResults.map((task) => (
            <HistoryTaskRow
              key={task.id}
              task={task}
              assignees={showAssignee ? team.filter((m) => task.assigneeIds.includes(m.id)) : undefined}
              dateLabel={!showAssignee}
              onClick={onOpenTask}
            />
          ))
        )}
      </div>
    );
  }

  const isEmpty = groupBy === "day" ? dayGroups.length === 0 : memberGroups.length === 0;

  return (
    <div className="space-y-4">
      <MonthSwitcher month={month} onChange={setMonth} />

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 dark:bg-zinc-800">
            <CalendarX className="text-ink-soft dark:text-ink-dark-soft" size={26} strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-ink-soft dark:text-ink-dark-soft">
            אין משימות עם דדליין בחודש הזה
          </p>
        </div>
      ) : groupBy === "day" ? (
        dayGroups.map(({ dateIso, items }) => (
          <div key={dateIso}>
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-soft dark:text-ink-dark-soft">
              {formatFullDate(dateIso)}
            </p>
            <div className="space-y-2">
              {items.map((task) => (
                <HistoryTaskRow
                  key={task.id}
                  task={task}
                  assignees={showAssignee ? team.filter((m) => task.assigneeIds.includes(m.id)) : undefined}
                  onClick={onOpenTask}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        memberGroups.map(({ member, items }) => (
          <div key={member.id} className="rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2.5">
              <Avatar member={member} size="sm" ring />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink dark:text-ink-dark">{member.name}</p>
                <RoleBadge member={member} className="mt-0.5" />
              </div>
              <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-bold text-ink-soft dark:text-ink-dark-soft">
                {items.length} משימות
              </span>
            </div>
            <div className="space-y-2">
              {items.map((task) => (
                <HistoryTaskRow key={task.id} task={task} dateLabel onClick={onOpenTask} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
