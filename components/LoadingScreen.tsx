import Image from "next/image";

export default function LoadingScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-soft ring-1 ring-black/5 dark:ring-white/10 animate-pulse-soft">
        <Image src="/logo.png" alt="סמל היחידה" fill sizes="64px" className="object-cover" />
      </div>
      <p className="text-sm font-medium text-ink-soft dark:text-ink-dark-soft">טוען...</p>
    </main>
  );
}
