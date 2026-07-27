import { Priority, PRIORITY_COLORS } from "@/lib/types";
import clsx from "clsx";

export default function PriorityBadge({
  priority,
  variant = "pill",
  className,
}: {
  priority: Priority;
  variant?: "pill" | "dot";
  className?: string;
}) {
  const c = PRIORITY_COLORS[priority];

  if (variant === "dot") {
    return (
      <span
        className={clsx("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
        style={{ backgroundColor: c.fg }}
        title={`עדיפות ${priority} — ${c.label}`}
      />
    );
  }

  return (
    <span
      className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", className)}
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      P{priority}
    </span>
  );
}
