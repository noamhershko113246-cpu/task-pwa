"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error";
}

interface ToastContextValue {
  showToast: (message: string, type?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] mx-auto flex w-full max-w-md flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft instead of throwing: a toast is supplementary UX, and this
    // hook is called from deep inside the data layer (lib/store.tsx) — a
    // hard throw here would cascade into breaking the whole app in any edge
    // case where the provider isn't mounted yet (e.g. Next.js's
    // auto-generated /_not-found prerender pass).
    if (process.env.NODE_ENV !== "production") {
      console.warn("useToast called outside ToastProvider — toast will be a no-op.");
    }
    return { showToast: () => {} };
  }
  return ctx;
}
