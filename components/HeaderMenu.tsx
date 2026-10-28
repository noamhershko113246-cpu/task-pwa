"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical, X, Accessibility, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { useDialog } from "@/lib/useDialog";
import { SHEET_SPRING } from "@/lib/motion";

export interface HeaderMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Internal navigation — rendered as a link. Use onClick for actions instead. */
  href?: string;
  onClick?: () => void;
  tone?: "default" | "accent" | "danger";
}

/**
 * The header's secondary actions behind one ⋮ button. Header icon rows used to hold 5–7 separate
 * 44px buttons, which doesn't fit next to the title on ~320–375px phones (the title got squeezed to
 * nothing and the rightmost buttons ran off-screen). A bottom sheet of labeled rows always fits at
 * any width, and the labels are clearer than a row of bare icons.
 */
export default function HeaderMenu({ items }: { items: HeaderMenuItem[] }) {
  const [open, setOpen] = useState(false);

  const dialogRef = useDialog<HTMLDivElement>(open, () => setOpen(false));
  const titleId = useId();

  const rowClass = (tone: HeaderMenuItem["tone"]) =>
    clsx(
      "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start text-sm font-bold transition-colors active:bg-zinc-100 dark:active:bg-zinc-800",
      tone === "danger" ? "text-rose-600 dark:text-rose-400" : "text-ink dark:text-ink-dark"
    );

  const iconWrapClass = (tone: HeaderMenuItem["tone"]) =>
    clsx(
      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
      tone === "accent"
        ? "bg-gradient-to-br from-violet-500 to-brand-600 text-white"
        : tone === "danger"
        ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
        : "bg-zinc-100 text-ink-soft dark:bg-zinc-800 dark:text-ink-dark-soft"
    );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 shrink-0 items-center justify-center press rounded-full glass shadow-soft"
        aria-label="עוד פעולות"
        title="עוד פעולות"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MoreVertical size={18} className="text-ink-soft" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={SHEET_SPRING}
              className="sheet-scroll fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white dark:bg-surface-dark-card px-4 pb-sheet pt-3 shadow-2xl md:bottom-6 md:mx-auto md:max-w-sm md:rounded-3xl"
            >
              <div className="flex justify-center pb-2">
                <div className="h-1.5 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              </div>
              <div className="mb-1 flex items-center justify-between px-1">
                <h2 id={titleId} className="text-base font-extrabold text-ink dark:text-ink-dark">עוד פעולות</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="סגור"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <>
                      <span className={iconWrapClass(item.tone)}>
                        <Icon size={17} />
                      </span>
                      {item.label}
                    </>
                  );
                  if (item.href) {
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={rowClass(item.tone)}
                      >
                        {content}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setOpen(false);
                        item.onClick?.();
                      }}
                      className={rowClass(item.tone)}
                    >
                      {content}
                    </button>
                  );
                })}
                <Link
                  href="/accessibility"
                  onClick={() => setOpen(false)}
                  className={rowClass("default")}
                >
                  <span className={iconWrapClass("default")}>
                    <Accessibility size={17} />
                  </span>
                  הצהרת נגישות
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
