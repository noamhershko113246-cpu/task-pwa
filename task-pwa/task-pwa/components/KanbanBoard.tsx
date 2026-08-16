"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { Task, TeamMember, TaskStatus, STATUS_LABELS } from "@/lib/types";
import { formatDeadline, isOverdue } from "@/lib/utils";
import PriorityBadge from "./PriorityBadge";
import Avatar from "./Avatar";
import clsx from "clsx";
import { memo } from "react";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "stuck", "done"];

const COLUMN_STYLES: Record<TaskStatus, { header: string; dot: string }> = {
  todo: { header: "text-zinc-500 dark:text-zinc-400", dot: "bg-zinc-400" },
  in_progress: { header: "text-indigo-600 dark:text-indigo-300", dot: "bg-indigo-500" },
  stuck: { header: "text-rose-600 dark:text-rose-300", dot: "bg-rose-500" },
  done: { header: "text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-500" },
  cancelled: { header: "text-zinc-400", dot: "bg-zinc-400" },
};

function KanbanCardImpl({
  task,
  assignees,
  onOpenDetail,
}: {
  task: Task;
  assignees: TeamMember[];
  onOpenDetail: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const overdue = isOverdue(task.deadline, task.status);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onOpenDetail(task)}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
          : undefined
      }
      className={clsx(
        "touch-none select-none rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-3 shadow-card transition-shadow",
        isDragging ? "opacity-50 shadow-lg" : "active:scale-[0.98]"
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <PriorityBadge priority={task.priority} variant="dot" />
        {overdue && <span className="text-[10px] font-bold text-rose-500">חורג</span>}
      </div>
      <p className="text-sm font-semibold leading-snug text-ink dark:text-ink-dark">{task.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-ink-soft dark:text-ink-dark-soft">{formatDeadline(task.deadline)}</span>
        <div className="flex -space-x-1.5 space-x-reverse">
          {assignees.slice(0, 3).map((a) => (
            <Avatar key={a.id} member={a} size="sm" ring />
          ))}
        </div>
      </div>
    </div>
  );
}

const KanbanCard = memo(KanbanCardImpl, (prev, next) => {
  const a = prev.task;
  const b = next.task;
  const sameAssignees = prev.assignees.map((m) => m.id).join(",") === next.assignees.map((m) => m.id).join(",");
  return (
    a.id === b.id &&
    a.title === b.title &&
    a.status === b.status &&
    a.priority === b.priority &&
    a.deadline === b.deadline &&
    sameAssignees
  );
});

function KanbanColumn({
  status,
  tasks,
  team,
  onOpenDetail,
}: {
  status: TaskStatus;
  tasks: Task[];
  team: TeamMember[];
  onOpenDetail: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const style = COLUMN_STYLES[status];

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex h-full w-64 shrink-0 snap-start flex-col rounded-2xl border p-3 transition-colors",
        isOver
          ? "border-brand-400 bg-brand-50/50 dark:bg-brand-500/10"
          : "border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40"
      )}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={clsx("h-2 w-2 rounded-full", style.dot)} />
        <p className={clsx("text-sm font-bold", style.header)}>{STATUS_LABELS[status]}</p>
        <span className="mr-auto rounded-full bg-white dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-ink-soft dark:text-ink-dark-soft">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            assignees={team.filter((m) => task.assigneeIds.includes(m.id))}
            onOpenDetail={onOpenDetail}
          />
        ))}
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-ink-soft dark:text-ink-dark-soft">אין משימות</p>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  tasks,
  team,
  onStatusChange,
  onOpenDetail,
}: {
  tasks: Task[];
  team: TeamMember[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onOpenDetail: (task: Task) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  );

  const activeTask = tasks.find((t) => t.id === activeId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === active.id);
    if (task && task.status !== newStatus) {
      onStatusChange(task.id, newStatus);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            team={team}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="w-64 rounded-2xl border border-brand-300 bg-white dark:bg-surface-dark-card p-3 shadow-lg">
            <p className="text-sm font-semibold text-ink dark:text-ink-dark">{activeTask.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
