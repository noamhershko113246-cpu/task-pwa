import { Task, TeamMember, Category } from "@/lib/types";
import { CategoryBadge } from "./CategoryChips";
import StepProgress from "./StepProgress";
import { formatCompletedAt } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import Avatar from "./Avatar";
import PriorityBadge from "./PriorityBadge";
import { Calendar, Paperclip } from "lucide-react";

export default function HistoryTaskRow({
  task,
  assignees,
  dateLabel,
  category,
  onClick,
}: {
  task: Task;
  assignees?: TeamMember[];
  dateLabel?: boolean;
  category?: Category; // the viewer's own category for this task

  onClick?: (task: Task) => void;
}) {
  return (
    <div
      onClick={() => onClick?.(task)}
      role={onClick ? "button" : undefined}
      className="flex items-center gap-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-3.5 shadow-card"
    >
      <PriorityBadge priority={task.priority} variant="dot" />
      {assignees && assignees.length > 0 && (
        <div className="flex shrink-0 -space-x-2 space-x-reverse">
          {assignees.slice(0, 3).map((a) => (
            <Avatar key={a.id} member={a} size="sm" ring />
          ))}
          {assignees.length > 3 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold text-ink-soft dark:text-ink-dark-soft ring-2 ring-white dark:ring-surface-dark-card">
              +{assignees.length - 3}
            </span>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink dark:text-ink-dark">{task.title}</p>
        {dateLabel ? (
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-soft dark:text-ink-dark-soft">
            <Calendar size={11} />
            {formatCompletedAt(task.completedAt)}
          </span>
        ) : (
          <p className="truncate text-xs text-ink-soft dark:text-ink-dark-soft">{task.description}</p>
        )}
      </div>
      {category && (
        <span className="shrink-0">
          <CategoryBadge category={category} />
        </span>
      )}
      <StepProgress steps={task.steps} compact />
      {(task.attachments?.length ?? 0) > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-ink-soft dark:text-ink-dark-soft">
          <Paperclip size={12} />
          {task.attachments!.length}
        </span>
      )}
      <StatusBadge status={task.status} className="shrink-0" />
    </div>
  );
}
