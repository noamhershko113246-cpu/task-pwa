import { Crown, ShieldCheck, Sparkles } from "lucide-react";
import { TeamMember, DEFAULT_DEPARTMENT } from "@/lib/types";
import clsx from "clsx";

/** Unit suffix appended to the role label — omitted entirely for the default (HR) department. */
function unitSuffix(member: Pick<TeamMember, "department" | "brigade">): string {
  if (!member.department || member.department === DEFAULT_DEPARTMENT) return "";
  return ` · ${member.department}${member.brigade ? " " + member.brigade : ""}`;
}

export default function RoleBadge({ member, className }: { member: TeamMember; className?: string }) {
  const unit = unitSuffix(member);

  if (member.isSuperManager) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 rounded-full bg-unit-red/15 px-2.5 py-1 text-xs font-bold text-unit-red dark:bg-unit-red/20",
          className
        )}
      >
        <Sparkles size={12} strokeWidth={2.5} />
        קמשא{unit}
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
        מפקד/ת{unit}
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
      חייל/ת{unit}
    </span>
  );
}
