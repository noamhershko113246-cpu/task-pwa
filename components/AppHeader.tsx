import Image from "next/image";
import clsx from "clsx";

export default function AppHeader({
  title,
  subtitle,
  size = "md",
}: {
  title: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}) {
  const logoSize = size === "lg" ? 56 : size === "sm" ? 36 : 44;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-soft"
        style={{ width: logoSize, height: logoSize }}
      >
        <Image src="/logo.png" alt="סמל היחידה" fill sizes={`${logoSize}px`} className="object-cover" priority />
      </div>
      <div className="min-w-0">
        {subtitle && (
          <p className="text-xs font-medium text-ink-soft dark:text-ink-dark-soft">{subtitle}</p>
        )}
        <h1
          className={clsx(
            "font-extrabold text-ink dark:text-ink-dark leading-tight truncate",
            size === "lg" ? "text-2xl" : "text-xl"
          )}
        >
          {title}
        </h1>
        {/* thin tri-color ribbon, echoing the unit crest */}
        <div className="mt-1.5 flex h-[3px] w-16 overflow-hidden rounded-full">
          <span className="flex-1 bg-unit-red" />
          <span className="flex-1 bg-black dark:bg-zinc-500" />
          <span className="flex-1 bg-unit-green" />
        </div>
      </div>
    </div>
  );
}
