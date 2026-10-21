"use client";

import { useEffect, useState } from "react";
import { Category, CATEGORY_COLORS } from "@/lib/types";
import clsx from "clsx";

function colorsFor(category: Category) {
  return CATEGORY_COLORS[category.color] ?? CATEGORY_COLORS.blue;
}

export function CategoryBadge({ category }: { category: Category }) {
  const c = colorsFor(category);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {category.name}
    </span>
  );
}

/** Single-select row of the viewer's own categories, plus "ללא" (null). */
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={clsx(
          "rounded-full px-3.5 py-2 text-xs font-bold transition-all active:scale-95",
          value === null
            ? "bg-brand-600 text-white"
            : "bg-zinc-100 dark:bg-zinc-800 text-ink-soft dark:text-ink-dark-soft"
        )}
      >
        ללא
      </button>
      {categories.map((cat) => {
        const c = colorsFor(cat);
        const active = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            aria-pressed={active}
            className={clsx(
              "rounded-full px-3.5 py-2 text-xs font-bold transition-all active:scale-95",
              active ? "ring-2 ring-offset-1 ring-brand-400 dark:ring-offset-surface-dark-card" : "opacity-75"
            )}
            style={{ backgroundColor: c.bg, color: c.fg }}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

/** "none" is the "ללא קטגוריה" bucket; an empty set means no filtering. */
export type CategoryFilterValue = Set<string>;
export const NO_CATEGORY = "none";

export function CategoryFilter({
  categories,
  selected,
  onChange,
}: {
  categories: Category[];
  selected: CategoryFilterValue;
  onChange: (next: CategoryFilterValue) => void;
}) {
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  const pill = (active: boolean) =>
    clsx(
      "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
      selected.size > 0 && !active && "opacity-50"
    );

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      <button
        onClick={() => onChange(new Set())}
        className={clsx(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
          selected.size === 0
            ? "bg-brand-600 text-white"
            : "bg-zinc-100 dark:bg-zinc-800 text-ink-soft dark:text-ink-dark-soft"
        )}
      >
        כל הקטגוריות
      </button>
      {categories.map((cat) => {
        const c = colorsFor(cat);
        const active = selected.has(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => toggle(cat.id)}
            aria-pressed={active}
            className={pill(active)}
            style={{ backgroundColor: active ? c.fg : c.bg, color: active ? "#fff" : c.fg }}
          >
            {cat.name}
          </button>
        );
      })}
      <button
        onClick={() => toggle(NO_CATEGORY)}
        aria-pressed={selected.has(NO_CATEGORY)}
        className={clsx(
          pill(selected.has(NO_CATEGORY)),
          selected.has(NO_CATEGORY)
            ? "bg-zinc-600 text-white"
            : "bg-zinc-100 dark:bg-zinc-800 text-ink-soft dark:text-ink-dark-soft"
        )}
      >
        ללא קטגוריה
      </button>
    </div>
  );
}

/**
 * Filter state that drops ids of categories that no longer exist — otherwise deleting the category
 * you're filtering by leaves an invisible filter that hides every task. With no categories left at
 * all the filter UI is hidden, so it's cleared entirely.
 */
export function useCategoryFilter(categories: Category[]) {
  const [selected, setSelected] = useState<CategoryFilterValue>(new Set());
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      if (categories.length === 0) return new Set();
      const valid = new Set(categories.map((c) => c.id));
      const next = new Set([...prev].filter((id) => id === NO_CATEGORY || valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [categories]);
  return [selected, setSelected] as const;
}

/** Shared filter predicate for the staff/manager lists. */
export function matchesCategoryFilter(selected: CategoryFilterValue, categoryId: string | undefined) {
  if (selected.size === 0) return true;
  return categoryId ? selected.has(categoryId) : selected.has(NO_CATEGORY);
}
