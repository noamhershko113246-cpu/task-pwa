"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, XCircle, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DURATION } from "@/lib/motion";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error";
  action?: ToastAction;
}

interface ToastContextValue {
  /** `options.action`: a button in the message (e.g. "ביטול" to undo) — tapping it closes the message.
   *  `options.durationMs`: how long it stays (default 4s). */
  showToast: (message: string, type?: "success" | "error", options?: { action?: ToastAction; durationMs?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const showToast = useCallback<ToastContextValue["showToast"]>((message, type = "success", options) => {
    const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type, action: options?.action }]);
    setTimeout(() => dismiss(id), options?.durationMs ?? 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] mx-auto flex w-full max-w-md flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role={t.type === "error" ? "alert" : undefined}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: DURATION.base }}
              className={`pointer-events-auto flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
                t.type === "error" ? "bg-rose-600" : "bg-zinc-900 dark:bg-zinc-800"
              }`}
            >
              {t.type === "error" ? (
                <XCircle size={16} className="shrink-0" />
              ) : (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              )}
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="press flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25"
                >
                  <Undo2 size={13} />
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
