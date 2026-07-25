"use client";

import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "חיפוש משימות...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-surface-dark-card py-2.5 pr-11 pl-9 text-sm text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 outline-none transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="ניקוי חיפוש"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-ink-soft"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
