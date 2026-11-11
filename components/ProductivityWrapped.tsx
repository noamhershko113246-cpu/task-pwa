"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { Sparkles, Trophy, Clock3, TrendingUp, ChevronDown, ChevronUp, LucideIcon } from "lucide-react";
import { Task } from "@/lib/types";
import { computeWrappedStats } from "@/lib/insights";
import { DURATION } from "@/lib/motion";

const SWIPE_THRESHOLD = 60;

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} דקות`;
  if (hours < 48) return `${Math.round(hours)} שעות`;
  return `${Math.round(hours / 24)} ימים`;
}

interface Slide {
  icon: LucideIcon;
  gradient: [string, string]; // from / to, as "R G B" so the card's transparency can be applied
  title: string;
  value: string;
  caption: string;
}

// Collapsed to one line by default so the tasks start higher on the screen; remembered per device.
const OPEN_KEY = "wrapped-open";

export default function ProductivityWrapped({ tasks }: { tasks: Task[] }) {
  const stats = computeWrappedStats(tasks);
  const [slide, setSlide] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(OPEN_KEY) === "1");
    } catch {
      // storage blocked — stays collapsed
    }
  }, []);
  const toggleOpen = (next: boolean) => {
    setOpen(next);
    try {
      window.localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {
      // storage blocked — applies for this visit only
    }
  };

  if (!stats.hasData) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => toggleOpen(true)}
        aria-expanded={false}
        className="press mb-4 flex min-h-11 w-full items-center gap-2 rounded-2xl border border-zinc-100 dark:border-zinc-800 glass px-3.5 py-2.5 text-start shadow-card"
      >
        <Sparkles size={15} className="shrink-0 text-brand-600 dark:text-brand-300" />
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-ink dark:text-ink-dark">
          השבוע: {stats.thisWeekCount} משימות הושלמו
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-ink-soft dark:text-ink-dark-soft">
          עוד
          <ChevronDown size={14} />
        </span>
      </button>
    );
  }

  const slides: Slide[] = [
    {
      icon: Trophy,
      gradient: ["180 83 9", "194 65 12"], // amber-700 → orange-700
      title: "היום הכי פרודוקטיבי השבוע",
      value: stats.mostProductiveDay ? `יום ${stats.mostProductiveDay}` : "עוד אין מספיק נתונים",
      caption:
        stats.mostProductiveDayCount > 0
          ? `${stats.mostProductiveDayCount} משימות הושלמו באותו יום`
          : "סיימו כמה משימות השבוע כדי לגלות",
    },
    {
      icon: Clock3,
      gradient: ["3 105 161", "29 78 216"], // sky-700 → blue-700
      title: "זמן ממוצע להשלמת משימה",
      value: stats.avgCompletionHours !== null ? formatHours(stats.avgCompletionHours) : "—",
      caption: "מרגע היצירה ועד הסימון כהושלם",
    },
    {
      icon: TrendingUp,
      gradient: ["4 120 87", "15 118 110"], // emerald-700 → teal-700
      title: "השבוע שלך",
      value: `${stats.thisWeekCount} משימות הושלמו`,
      caption:
        stats.percentVsAverage >= 0
          ? `${Math.round(stats.percentVsAverage)}% מעל הממוצע השבועי שלך — כל הכבוד! 🎉`
          : `${Math.round(Math.abs(stats.percentVsAverage))}% מתחת לממוצע השבועי — עוד קצת ותחזרו לשיא`,
    },
  ];

  const goTo = (i: number) => setSlide(((i % slides.length) + slides.length) % slides.length);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_THRESHOLD) goTo(slide + 1);
    else if (info.offset.x >= SWIPE_THRESHOLD) goTo(slide - 1);
  };

  const current = slides[slide];
  const Icon = current.icon;

  return (
    <section className="mb-5 overflow-hidden rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-card">
      {/* See-through like the other cards (.wrapped-glass, globals.css), but kept a step more solid
          and with a soft text shadow, since its text is white on color. */}
      <div
        className="wrapped-glass relative px-5 pt-5 pb-4 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.3)]"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgb(${current.gradient[0]} / var(--wrapped-alpha)), rgb(${current.gradient[1]} / var(--wrapped-alpha)))`,
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
            <Sparkles size={13} />
            Wrapped · הפרודוקטיביות שלך
          </p>
          <button
            type="button"
            onClick={() => toggleOpen(false)}
            aria-expanded={true}
            aria-label="צמצום"
            className="-m-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          >
            <ChevronUp size={16} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: DURATION.slow }}
            className="min-h-[104px] cursor-grab touch-pan-y active:cursor-grabbing"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Icon size={20} />
            </div>
            <p className="text-xs font-semibold">{current.title}</p>
            <motion.p
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
              className="mt-1 text-2xl font-extrabold"
            >
              {current.value}
            </motion.p>
            <p className="mt-1 text-xs">{current.caption}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`שקופית ${i + 1}`}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i === slide ? "bg-white" : "bg-white/30"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
