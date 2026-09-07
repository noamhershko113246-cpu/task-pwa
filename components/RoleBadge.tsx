import { Crown, ShieldCheck, Sparkles, KeyRound } from "lucide-react";
import { TeamMember } from "@/lib/types";
import clsx from "clsx";

/**
 * Unit suffix appended to the role label. Always shown when department is set — it used to be
 * omitted for department === DEFAULT_DEPARTMENT ('משא"ן'), back when there was only one
 * department in the whole app and "unset" and "the default" were the same thing. That's no
 * longer true: 'משא"ן' now exists at both מפא"ג and חטיבה 10, so suppressing the suffix for it
 * specifically hid exactly the information that distinguishes those two isolated instances.
 */
function unitSuffix(member: Pick<TeamMember, "department" | "brigade">): string {
  if (!member.department) return "";
  return ` · ${member.department}${member.brigade ? " " + member.brigade : ""}`;
}

export default function RoleBadge({ member, className }: { member: TeamMember; className?: string }) {
  const unit = unitSuffix(member);

  // Checked first and shown on its own: a super admin (e.g. Noam) bypasses rank
  // and department entirely, but that's a hidden system-wide permission, not a
  // promotion — she keeps her actual rank (often "soldier") everywhere else, so
  // this badge says exactly what she has without also claiming to be קמשא/מפקד/ת.
  if (member.isSuperAdmin) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
          className
        )}
      >
        <KeyRound size={12} strokeWidth={2.5} />
        Super Admin
      </span>
    );
  }
  if (member.isSuperManager) {
    // "מפקד/ת מחלקה" — deliberately generic, not a specific role name: the actual title (e.g.
    // "קמשא" for a משא"ן commander, "קטא" for a טנ"א commander) belongs in this person's own
    // `title` field and is shown separately. A hardcoded specific title here was wrong the
    // moment a second department got its own commander — "קמשא" literally means "the משא"ן
    // officer" and is factually false for anyone commanding a different department.
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 rounded-full bg-unit-red/15 px-2.5 py-1 text-xs font-bold text-unit-red dark:bg-unit-red/20",
          className
        )}
      >
        <Sparkles size={12} strokeWidth={2.5} />
        מפקד/ת מחלקה{unit}
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
