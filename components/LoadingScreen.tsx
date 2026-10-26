import Image from "next/image";

/** A grey placeholder block; the whole skeleton pulses together via its parent. */
function Bone({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

/**
 * Shown while the first data load is in flight. "list" (the default) is a skeleton of the screens
 * people actually land on — header, search, filter chips and a few task cards, plus the bottom bar —
 * so the page appears to fill in rather than being replaced by a blank "loading" screen. "logo" is
 * the plain centered logo, for screens that have no list to mimic (login, the root redirect).
 */
export default function LoadingScreen({ variant = "list" }: { variant?: "list" | "logo" }) {
  if (variant === "logo") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-soft ring-1 ring-black/5 dark:ring-white/10 animate-pulse-soft">
          <Image src="/logo.png" alt="סמל היחידה" fill sizes="64px" className="object-cover" />
        </div>
        <p role="status" className="text-sm font-medium text-ink-soft dark:text-ink-dark-soft">טוען...</p>
      </main>
    );
  }

  return (
    <main
      aria-busy="true"
      className="relative mx-auto min-h-dvh max-w-md px-4 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))] md:my-8 md:max-w-3xl md:rounded-3xl md:bg-surface md:shadow-xl md:dark:bg-surface-dark"
    >
      <p role="status" className="sr-only">טוען...</p>

      {/* aria-hidden: the shapes carry no information — the status line above is what a screen reader gets */}
      <div aria-hidden="true" className="animate-pulse-soft">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bone className="h-14 w-14 !rounded-full" />
            <div className="space-y-2">
              <Bone className="h-3 w-16" />
              <Bone className="h-5 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Bone className="h-11 w-11 !rounded-full" />
            <Bone className="h-11 w-11 !rounded-full" />
          </div>
        </div>

        <Bone className="mb-4 h-11 !rounded-2xl" />

        <div className="mb-5 flex gap-2">
          {["w-14", "w-12", "w-12", "w-12", "w-12", "w-12"].map((w, i) => (
            <Bone key={i} className={`h-8 shrink-0 !rounded-full ${w}`} />
          ))}
        </div>

        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white p-4 shadow-soft dark:bg-surface-dark-card">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Bone className="h-4 w-2/3" />
                <Bone className="h-3 w-3 !rounded-full" />
              </div>
              <Bone className="mb-2 h-3 w-1/2" />
              <div className="mt-3 flex items-center justify-between">
                <Bone className="h-7 w-7 !rounded-full" />
                <Bone className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 flex h-16 items-center justify-center gap-16 border-t border-zinc-100 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-surface-dark-card"
      >
        <Bone className="h-6 w-14" />
        <Bone className="h-6 w-14" />
      </div>
    </main>
  );
}
