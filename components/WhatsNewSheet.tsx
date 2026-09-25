"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { LATEST_RELEASE } from "@/lib/whatsNew";

export default function WhatsNewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="sheet-scroll fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-surface-dark-card px-5 pb-8 pt-3 shadow-2xl md:bottom-6 md:mx-auto md:max-w-lg md:rounded-3xl"
          >
            <div className="flex justify-center pb-3">
              <div className="h-1.5 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
                  <Megaphone size={18} />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-ink dark:text-ink-dark">מה חדש</h2>
                  <p className="text-xs text-ink-soft dark:text-ink-dark-soft">עודכן ב-{LATEST_RELEASE.date}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-ink-soft hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="סגור"
              >
                <X size={18} />
              </button>
            </div>

            <ul className="mb-6 space-y-2.5">
              {LATEST_RELEASE.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/30 p-3.5 text-sm text-ink dark:text-ink-dark"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-brand-600 py-3.5 font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
            >
              הבנתי
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
