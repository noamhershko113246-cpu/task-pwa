import { ActivityEvent, TeamMember } from "@/lib/types";
import { timeAgoHebrew } from "@/lib/utils";
import Avatar from "./Avatar";

export default function ActivityTimeline({
  events,
  team,
}: {
  events: ActivityEvent[];
  team: TeamMember[];
}) {
  const findMember = (id: string) => team.find((m) => m.id === id);

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const member = findMember(event.userId);
        if (!member) return null;
        const isLast = i === events.length - 1;
        return (
          <div key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span className="absolute right-[17px] top-9 h-full w-px bg-zinc-200 dark:bg-zinc-700" />
            )}
            <Avatar member={member} size="sm" ring />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-ink dark:text-ink-dark leading-relaxed">
                <span className="font-bold">{member.name}</span>{" "}
                {event.action}{" "}
                <span className="font-semibold text-brand-600 dark:text-brand-300">
                  &rsquo;{event.taskTitle}&rsquo;
                </span>
              </p>
              <p className="mt-0.5 text-xs text-ink-soft dark:text-ink-dark-soft">
                {timeAgoHebrew(event.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
