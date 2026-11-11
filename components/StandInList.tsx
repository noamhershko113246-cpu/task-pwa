"use client";

import { useState } from "react";
import { ChevronDown, UserCog } from "lucide-react";
import clsx from "clsx";
import { TeamMember } from "@/lib/types";
import { HQ_UNIT } from "@/lib/orgStructure";

// Up to this many people are shown as one flat list — grouping only earns its keep once the list is
// long (a regular person's handful of stand-in targets shouldn't be hidden behind accordions).
const FLAT_LIST_MAX = 5;

function PersonChip({ m }: { m: TeamMember }) {
  return (
    <a
      href={`/staff?user=${m.id}`}
      className="flex items-center gap-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800/60 py-1.5 pr-1.5 pl-3 text-xs font-semibold text-ink dark:text-ink-dark transition-transform active:scale-95"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-avatar text-[10px] font-bold text-white ${m.colorFrom} ${m.colorTo}`}
      >
        {m.initials}
      </span>
      {m.name}
    </a>
  );
}

/**
 * "ממלא/ת מקום עבור" list. For a super-admin this is the whole org, so it's grouped by unit
 * (מפא"ג together, each brigade together) as collapsible sections — only the viewer's own unit starts
 * open, so the card stays short instead of being a wall of names.
 */
export default function StandInList({
  targets,
  ownBrigade,
  unitOrder,
}: {
  targets: TeamMember[];
  ownBrigade?: string;
  /** Unit keys in display order (org_units order); units not listed go last. */
  unitOrder: string[];
}) {
  const [openUnits, setOpenUnits] = useState<Set<string>>(() => new Set(ownBrigade ? [ownBrigade] : []));
  const [listOpen, setListOpen] = useState(false);

  const groups = new Map<string, TeamMember[]>();
  for (const m of targets) {
    const unit = m.brigade || HQ_UNIT;
    const list = groups.get(unit) ?? [];
    list.push(m);
    groups.set(unit, list);
  }
  const rank = (unit: string) => {
    const i = unitOrder.indexOf(unit);
    return i === -1 ? unitOrder.length : i;
  };
  const orderedUnits = Array.from(groups.keys()).sort((a, b) => rank(a) - rank(b));

  const toggle = (unit: string) =>
    setOpenUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit);
      else next.add(unit);
      return next;
    });

  const flat = targets.length <= FLAT_LIST_MAX || orderedUnits.length === 1;

  // A short list is one scrolling row (label + people); a long, grouped one (a super-admin's whole
  // org) is a single collapsed line until opened — either way the tasks below start high on the screen.
  if (flat) {
    return (
      <div className="no-scrollbar mb-4 flex items-center gap-2 overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-800 glass p-2 shadow-card">
        <span className="flex shrink-0 items-center gap-1 ps-1.5 text-[11px] font-bold text-ink-soft dark:text-ink-dark-soft">
          <UserCog size={13} />
          ממלא/ת מקום:
        </span>
        {targets.map((m) => (
          <span key={m.id} className="shrink-0 whitespace-nowrap">
            <PersonChip m={m} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 glass p-2 shadow-card">
      <button
        onClick={() => setListOpen((v) => !v)}
        aria-expanded={listOpen}
        className="flex min-h-11 w-full items-center gap-1.5 rounded-xl px-1.5 text-xs font-bold text-ink dark:text-ink-dark"
      >
        <UserCog size={13} className="text-ink-soft dark:text-ink-dark-soft" />
        ממלא/ת מקום עבור
        <span className="font-medium text-ink-soft dark:text-ink-dark-soft">({targets.length})</span>
        <ChevronDown size={14} className={clsx("ms-auto text-ink-soft transition-transform", !listOpen && "-rotate-90")} />
      </button>

      {listOpen && (
        <div className="mt-1 space-y-1.5">
          {orderedUnits.map((unit) => {
            const members = groups.get(unit)!;
            const open = openUnits.has(unit);
            return (
              <div key={unit}>
                <button
                  onClick={() => toggle(unit)}
                  aria-expanded={open}
                  className="flex min-h-11 w-full items-center justify-between rounded-xl px-2 text-xs font-bold text-ink-soft dark:text-ink-dark-soft active:bg-zinc-50 dark:active:bg-zinc-800/60"
                >
                  <span>
                    {unit} <span className="font-medium">({members.length})</span>
                  </span>
                  <ChevronDown size={14} className={clsx("transition-transform", !open && "-rotate-90")} />
                </button>
                {open && (
                  <div className="flex flex-wrap gap-2 px-1 pb-2 pt-1">
                    {members.map((m) => (
                      <PersonChip key={m.id} m={m} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
