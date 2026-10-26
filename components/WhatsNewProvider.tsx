"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getSession } from "@/lib/auth";
import { markLatestReleaseSeen, shouldShowLatestRelease } from "@/lib/whatsNew";

// How long the notes must be on screen before they count as seen (if not closed sooner).
const SEEN_AFTER_MS = 1500;
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
  // One check per logged-in person per app load is enough; this also stops a second check from
  // starting while the first is still waiting on the database.
  const checkedFor = useRef<string | null>(null);
  // Who the notes popped up for automatically and haven't been recorded as seen yet.
  const pendingSeenFor = useRef<string | null>(null);
  useEffect(() => {
    const userId = getSession()?.userId;
    if (!userId || checkedFor.current === userId) return;
    checkedFor.current = userId;
    shouldShowLatestRelease(userId).then((show) => {
      // Still the same person (they didn't log out meanwhile)?
      if (!show || getSession()?.userId !== userId) return;
      pendingSeenFor.current = userId;
      setOpen(true);
    });
  }, [pathname]);

  const recordSeen = () => {
    const userId = pendingSeenFor.current;
    if (!userId) return;
    pendingSeenFor.current = null;
    markLatestReleaseSeen(userId);
  };

  // Seen once it has been on screen for a moment — even if they then leave without tapping "הבנתי".
  useEffect(() => {
    if (!open || !pendingSeenFor.current) return;
    const timer = setTimeout(recordSeen, SEEN_AFTER_MS);
    return () => clearTimeout(timer);
  }, [open]);

  const close = () => {
    recordSeen();
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
