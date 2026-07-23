import clsx from "clsx";
import { TeamMember } from "@/lib/types";

export default function Avatar({
  member,
  size = "md",
  ring = false,
}: {
  member: TeamMember;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
}) {
  const sizes = { sm: "w-7 h-7 text-[11px]", md: "w-9 h-9 text-xs", lg: "w-12 h-12 text-sm" };
  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shrink-0",
        member.colorFrom,
        member.colorTo,
        sizes[size],
        ring &&
          (member.isSuperManager
            ? "ring-2 ring-unit-red"
            : member.isManager
            ? "ring-2 ring-unit-tan"
            : "ring-2 ring-white dark:ring-surface-dark-card")
      )}
      title={member.name}
    >
      {member.initials}
    </div>
  );
}
