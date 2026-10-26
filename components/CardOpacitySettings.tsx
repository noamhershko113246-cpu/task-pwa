"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { TeamMember } from "@/lib/types";
import { resolveBackgroundLayer } from "@/lib/backgroundPresets";
import { CARD_OPACITY_OPTIONS, getCardOpacity, setCardOpacity } from "@/lib/cardOpacity";

// Shown behind the previews when the person has no background of their own, so the difference is visible.
const SAMPLE_BACKGROUND = "linear-gradient(135deg, #f97316, #6366f1)";

/**
 * Settings → "שקיפות הכרטיסים": a scale of five options, each previewed as a mini task card over the
 * person's own background (with the same light wash the app puts over it), so they can pick by eye.
 */
export default function CardOpacitySettings({ member }: { member: Pick<TeamMember, "backgroundUrl" | "backgroundPreset"> }) {
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    setValue(getCardOpacity());
  }, []);

  const layer = resolveBackgroundLayer(member) ?? SAMPLE_BACKGROUND;

  return (
    <section>
      <p className="mb-1 text-sm font-bold text-ink dark:text-ink-dark">שקיפות הכרטיסים</p>
      <p className="mb-2 text-[11px] leading-snug text-ink-soft dark:text-ink-dark-soft">
        כמה רואים את הרקע דרך המשימות והכרטיסים במסך הראשי. נשמר במכשיר הזה בלבד.
      </p>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="שקיפות הכרטיסים">
        {CARD_OPACITY_OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              role="radio"
              aria-checked={active}
              onClick={() => {
                setValue(option.value);
                setCardOpacity(option.value);
              }}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={`relative block h-20 w-full overflow-hidden rounded-xl bg-cover bg-center ring-2 ring-offset-1 ring-offset-white transition-all dark:ring-offset-surface-dark-card ${
                  active ? "ring-brand-500" : "ring-transparent"
                }`}
                style={{
                  // Same wash as the page (light or dark, set on the dashboards' <main>), falling back to light.
                  backgroundImage: `linear-gradient(var(--bg-scrim, rgb(250 250 250 / 0.82)), var(--bg-scrim, rgb(250 250 250 / 0.82))), ${layer}`,
                }}
              >
                {/* Mini task card at this option's opacity — .glass reads --glass-alpha from here. */}
                <span
                  className="glass absolute inset-x-1.5 top-1/2 block -translate-y-1/2 rounded-lg border border-white/70 p-1.5 shadow-sm dark:border-zinc-700/60"
                  style={{ "--glass-alpha": option.value } as CSSProperties}
                >
                  <span className="mb-1 block h-1.5 w-4/5 rounded-full bg-ink/70 dark:bg-ink-dark/70" />
                  <span className="block h-1.5 w-1/2 rounded-full bg-ink-soft/50 dark:bg-ink-dark-soft/50" />
                </span>
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  active ? "text-brand-700 dark:text-brand-300" : "text-ink-soft dark:text-ink-dark-soft"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
