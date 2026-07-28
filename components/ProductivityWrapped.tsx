"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Trophy, Clock3, TrendingUp, LucideIcon } from "lucide-react";
import { Task } from "@/lib/types";
import { computeWrappedStats } from "@/lib/insights";

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} דקות`;
  if (hours < 48) return `${Math.round(hours)} שעות`;
  return `${Math.round(hours / 24)} ימים`;
}

interface Slide {
  icon: LucideIcon;
  gradient: string;
  title: string;
  value: string;
  caption: string;
}

export default function ProductivityWrapped({ tasks }: { tasks: Task[] }) {
  const stats = computeWrappedStats(tasks);
  const [slide, setSlide] = useState(0);

  if (!stats.hasData) return null;

  const slides: Slide[] = [
    {
      icon: Trophy,
      gradient: "from-amber-400 to-orange-500",
      title: "היום הכי פרודוקטיבי השבוע",
      value: stats.mostProductiveDay ? `יום ${stats.mostProductiveDay}` : "עוד אין מספיק נתונים",
      caption:
        stats.mostProductiveDayCount > 0
          ? `${stats.mostProductiveDayCount} משימות הושלמו באותו יום`
          : "סיימו כמה משימות השבוע כדי לגלות",
    },
    {
      icon: Clock3,
      gradient: "from-sky-400 to-blue-500",
      title: "זמן ממוצע להשלמת משימה",
      value: stats.avgCompletionHours !== null ? formatHours(stats.avgCompletionHours) : "—",
      caption: "מרגע היצירה ועד הסימון כהושלם",
    },
    {
      icon: TrendingUp,
      gradient: "from-emerald-400 to-teal-500",
      title: "השבוע שלך",
      value: `${stats.thisWeekCount} משימות הושלמו`,
      caption:
        stats.percentVsAverage >= 0
          ? `${Math.round(stats.percentVsAverage)}% מעל הממוצע השבועי שלך — כל הכבוד! 🎉`
          : `${Math.round(Math.abs(stats.percentVsAverage))}% מתחת לממוצע השבועי — עוד קצת ותחזרו לשיא`,
    },
  ];

  const current = slides[slide];
  const Icon = current.icon;

  return (
    <section className="mb-5 overflow-hidden rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-card">
      <div className={`relative bg-gradient-to-br ${current.gradient} px-5 pt-5 pb-4 text-white`}>
        <p className="mb-4 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-90">
          <Sparkles size={13} />
          Wrapped · הפרודוקטיביות שלך
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            className="min-h-[104px]"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Icon size={20} />
            </div>
            <p className="text-xs font-semibold opacity-90">{current.title}</p>
            <motion.p
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
              className="mt-1 text-2xl font-extrabold"
            >
              {current.value}
            </motion.p>
            <p className="mt-1 text-xs opacity-90">{current.caption}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`שקופית ${i + 1}`}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i === slide ? "bg-white" : "bg-white/30"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
