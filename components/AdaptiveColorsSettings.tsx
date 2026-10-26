"use client";

import { useEffect, useState } from "react";
import { Check, Palette as PaletteIcon, Sparkles } from "lucide-react";
import {
  ADAPTIVE_COLORS_EVENT,
  RGB,
  buildPalette,
  getAdaptiveColorsEnabled,
  resolveSeed,
  setAdaptiveColorsEnabled,
  setChosenColor,
  swatchesForBackground,
} from "@/lib/adaptiveColors";
import { useOwnBackgroundSource } from "./AdaptiveColors";

const rgb = (c: RGB) => `rgb(${c.join(" ")})`;

/**
 * Settings → "צבעי האפליקציה": keep the regular colors, or take them from the background. When taken
 * from the background, the colors found in it are shown (best first) and any of them can be picked.
 */
export default function AdaptiveColorsSettings() {
  const { url, gradientCss, loaded } = useOwnBackgroundSource();
  const hasBackground = Boolean(url || gradientCss);

  const [enabled, setEnabled] = useState(false);
  const [swatches, setSwatches] = useState<RGB[]>([]);
  const [selected, setSelected] = useState<RGB | null>(null);

  useEffect(() => {
    const sync = () => setEnabled(getAdaptiveColorsEnabled());
    sync();
    window.addEventListener(ADAPTIVE_COLORS_EVENT, sync);
    return () => window.removeEventListener(ADAPTIVE_COLORS_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!hasBackground) {
      setSwatches([]);
      setSelected(null);
      return;
    }
    let cancelled = false;
    const source = { url, gradientCss };
    swatchesForBackground(source).then((found) => {
      if (cancelled) return;
      setSwatches(found);
      setSelected(resolveSeed(source, found));
    });
    return () => {
      cancelled = true;
    };
  }, [url, gradientCss, hasBackground]);

  const pick = (color: RGB, index: number) => {
    setSelected(color);
    // The first (best) swatch is the automatic choice — store "automatic" rather than pinning it.
    setChosenColor({ url, gradientCss }, index === 0 ? null : color);
  };

  const modes = [
    { on: false, label: "רגילים", icon: PaletteIcon },
    { on: true, label: "לפי הרקע", icon: Sparkles },
  ];

  return (
    <section>
      <p className="mb-1 text-sm font-bold text-ink dark:text-ink-dark">צבעי האפליקציה</p>
      <p className="mb-2 text-[11px] leading-snug text-ink-soft dark:text-ink-dark-soft">
        להשאיר את הצבעים הרגילים, או שהכפתורים והצבעים באפליקציה ייקחו את הצבע מהרקע שלך. נשמר במכשיר הזה בלבד.
      </p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="צבעי האפליקציה">
        {modes.map(({ on, label, icon: Icon }) => (
          <button
            key={label}
            role="radio"
            aria-checked={enabled === on}
            onClick={() => setAdaptiveColorsEnabled(on)}
            className={`flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors ${
              enabled === on
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                : "border-zinc-200 dark:border-zinc-700 text-ink-soft dark:text-ink-dark-soft"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {enabled && loaded && !hasBackground && (
        <p className="mt-2 text-[11px] text-ink-soft dark:text-ink-dark-soft">
          עדיין אין לך רקע — בחר/י תמונה או צבע מוכן למעלה, והצבעים יותאמו אליו.
        </p>
      )}

      {enabled && swatches.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
            {swatches.length > 1 ? "הצבעים שנמצאו ברקע שלך — בחר/י אחד" : "הצבע שנמצא ברקע שלך"}
          </p>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="צבע מהרקע">
            {swatches.map((color, i) => {
              const palette = buildPalette(color);
              const active = selected?.join() === color.join();
              return (
                <button
                  key={color.join()}
                  role="radio"
                  aria-checked={active}
                  aria-label={i === 0 ? `צבע ${i + 1} (אוטומטי)` : `צבע ${i + 1}`}
                  onClick={() => pick(color, i)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition-all dark:ring-offset-surface-dark-card ${
                    active ? "scale-95 ring-zinc-400 dark:ring-zinc-500" : "ring-transparent"
                  }`}
                  // The swatch shows the actual button color it would produce, with the raw color from the picture as a ring inside.
                  style={{ backgroundColor: rgb(palette[600]), boxShadow: `inset 0 0 0 4px ${rgb(color)}` }}
                >
                  {active && <Check size={16} className="text-white" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-soft dark:text-ink-dark-soft">הראשון הוא הבחירה האוטומטית — הצבע הבולט ביותר ברקע.</p>
        </div>
      )}
    </section>
  );
}
