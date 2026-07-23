"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ListChecks, History } from "lucide-react";
import clsx from "clsx";

export default function BottomNav({ base }: { base: "staff" | "manager" }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : "";

  const todayHref = `/${base}${suffix}`;
  const historyHref = `/${base}/history${suffix}`;
  const isHistory = pathname.includes("/history");

  const tabs = [
    { href: todayHref, label: "משימות", icon: ListChecks, active: !isHistory },
    { href: historyHref, label: "היסטוריה", icon: History, active: isHistory },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-zinc-100 dark:border-zinc-800 bg-white/90 dark:bg-surface-dark-card/90 backdrop-blur-md px-6 pb-[env(safe-area-inset-bottom)] pt-2">
      <div className="flex items-center justify-around">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 py-2 transition-colors"
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 2}
              className={active ? "text-brand-600 dark:text-brand-300" : "text-ink-soft dark:text-ink-dark-soft"}
            />
            <span
              className={clsx(
                "text-[11px] font-semibold",
                active ? "text-brand-600 dark:text-brand-300" : "text-ink-soft dark:text-ink-dark-soft"
              )}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
