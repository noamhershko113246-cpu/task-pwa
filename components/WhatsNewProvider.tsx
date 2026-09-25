"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasSeenLatestRelease, markReleaseSeen } from "@/lib/whatsNew";
import WhatsNewSheet from "./WhatsNewSheet";

interface WhatsNewContextValue {
  openWhatsNew: () => void;
}

const WhatsNewContext = createContext<WhatsNewContextValue | null>(null);

export function WhatsNewProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Re-checked on every route change, not just once at mount: this provider sits above the
  // whole app and never remounts, so a plain mount-only check would miss someone who lands on
  // /login first (no session yet) and only becomes eligible once client-side navigation takes
  // them to /staff or /manager after logging in.
  useEffect(() => {
    if (open) return;
    if (getSession() && !hasSeenLatestRelease()) setOpen(true);
  }, [pathname, open]);

  const close = () => {
    markReleaseSeen();
    setOpen(false);
  };

  return (
    <WhatsNewContext.Provider value={{ openWhatsNew: () => setOpen(true) }}>
      {children}
      <WhatsNewSheet open={open} onClose={close} />
    </WhatsNewContext.Provider>
  );
}

export function useWhatsNew() {
  const ctx = useContext(WhatsNewContext);
  if (!ctx) throw new Error("useWhatsNew must be used within a WhatsNewProvider");
  return ctx;
}
