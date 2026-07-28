"use client";

import { useState } from "react";
import { Plus, ArrowUp } from "lucide-react";

export default function QuickAddBar({
  onAdd,
  placeholder = "הוספה מהירה — הקלידו ולחצו Enter...",
}: {
  onAdd: (title: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border bg-white dark:bg-surface-dark-card px-4 py-3 shadow-card transition-colors ${
        focused ? "border-brand-400" : "border-zinc-100 dark:border-zinc-800"
      }`}
    >
      <Plus size={18} className="shrink-0 text-zinc-400" />
      <input
        id="quick-add-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-ink dark:text-ink-dark placeholder:text-zinc-400 outline-none"
      />
      {value.trim() && (
        <button
          onClick={submit}
          aria-label="הוספה"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-transform active:scale-90"
        >
          <ArrowUp size={16} />
        </button>
      )}
    </div>
  );
}
