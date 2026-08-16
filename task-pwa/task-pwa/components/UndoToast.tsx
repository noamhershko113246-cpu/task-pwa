"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Undo2, CheckCircle2 } from "lucide-react";

export default function UndoToast({
  taskTitle,
  onUndo,
}: {
  taskTitle: string | null;
  onUndo: () => void;
}) {
  return (
    <AnimatePresence>
      {taskTitle && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-x-0 bottom-24 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-2xl bg-zinc-900 dark:bg-zinc-800 px-4 py-3 text-white shadow-2xl"
        >
          <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
          <p className="min-w-0 flex-1 truncate text-sm">
            &rsquo;{taskTitle}&rsquo; סומנה כהושלמה
          </p>
          <button
            onClick={onUndo}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-white/25 active:scale-95"
          >
            <Undo2 size={13} />
            בטל
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
