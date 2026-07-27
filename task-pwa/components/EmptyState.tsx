"use client";

import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";

export default function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center text-center px-8 py-20 gap-4"
    >
      <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
        <PartyPopper className="text-emerald-600 dark:text-emerald-300" size={34} strokeWidth={1.8} />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-bold text-ink dark:text-ink-dark">
          כל הכבוד! אין לך משימות פתוחות להיום ✨
        </p>
        <p className="text-sm text-ink-soft dark:text-ink-dark-soft">
          תתעדכן/י ברגע שתוקצה לך משימה חדשה
        </p>
      </div>
    </motion.div>
  );
}
