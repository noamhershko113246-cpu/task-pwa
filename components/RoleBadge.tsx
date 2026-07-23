import { Crown, ShieldCheck, Sparkles } from "lucide-react";
import { TeamMember } from "@/lib/types";
import clsx from "clsx";

export default function RoleBadge({ member, className }: { member: TeamMember; className?: string }) {
  if (member.isSuperManager) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 rounded-full bg-unit-red/15 px-2.5 py-1 text-xs font-bold text-unit-red dark:bg-unit-red/20",
          className
        )}
      >
        <Sparkles size={12} strokeWidth={2.5} />
        מפקדה ראשית
      </span>
    );
  }
  if (member.isManager) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 rounded-full bg-unit-tan/20 px-2.5 py-1 text-xs font-bold text-unit-tan dark:bg-unit-tan/15",
          className
        )}
      >
        <Crown size={12} strokeWidth={2.5} />
        מפקדת
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
        className
      )}
    >
      <ShieldCheck size={12} strokeWidth={2.5} />
      חייל/ת
    </span>
  );
}
