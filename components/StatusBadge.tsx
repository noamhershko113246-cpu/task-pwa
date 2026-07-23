import { Circle, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { TaskStatus, STATUS_LABELS } from "@/lib/types";
import clsx from "clsx";

const STYLES: Record<TaskStatus, { bg: string; fg: string; icon: React.ElementType }> = {
  todo: { bg: "bg-zinc-100 dark:bg-zinc-800", fg: "text-zinc-500 dark:text-zinc-400", icon: Circle },
  in_progress: { bg: "bg-indigo-100 dark:bg-indigo-500/15", fg: "text-indigo-600 dark:text-indigo-300", icon: Clock },
  stuck: { bg: "bg-rose-100 dark:bg-rose-500/15", fg: "text-rose-600 dark:text-rose-300", icon: AlertTriangle },
  done: { bg: "bg-emerald-100 dark:bg-emerald-500/15", fg: "text-emerald-600 dark:text-emerald-300", icon: CheckCircle2 },
  cancelled: { bg: "bg-zinc-200 dark:bg-zinc-700", fg: "text-zinc-500 dark:text-zinc-400", icon: XCircle },
};

export default function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const s = STYLES[status];
  const Icon = s.icon;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        s.bg,
        s.fg,
        className
      )}
    >
      <Icon size={13} strokeWidth={2.5} />
      {STATUS_LABELS[status]}
    </span>
  );
}
