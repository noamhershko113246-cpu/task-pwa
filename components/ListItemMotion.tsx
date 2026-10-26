"use client";

import { forwardRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE } from "@/lib/motion";

/**
 * Wraps one row of a list that tasks can join (created, reopened, reassigned to you): it fades in from
 * slightly below. Leaving is NOT animated here — a finished task collapses inside its own card
 * (TaskCard) before it is removed, and anything else just disappears.
 *
 * It used to also animate exits and re-flow the rows beneath (AnimatePresence "popLayout" + layout
 * animations). That left a finished task's green "done" background and a blank gap on screen on an
 * iPhone, so the list no longer depends on those.
 */
const ListItemMotion = forwardRef<HTMLDivElement, { children: ReactNode }>(function ListItemMotion({ children }, ref) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE }}
    >
      {children}
    </motion.div>
  );
});

export default ListItemMotion;
