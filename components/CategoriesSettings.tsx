"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { useTaskStore } from "@/lib/store";
import { Category, CATEGORY_COLORS, MAX_CATEGORIES, MAX_CATEGORY_NAME_LENGTH } from "@/lib/types";
import clsx from "clsx";

const COLOR_KEYS = Object.keys(CATEGORY_COLORS);

function ColorRow({ value, onPick }: { value: string; onPick: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key)}
          aria-label={`צבע ${key}`}
          aria-pressed={value === key}
          className={clsx(
            "h-7 w-7 rounded-full border-2 transition-transform active:scale-90",
            value === key ? "border-ink dark:border-white scale-110" : "border-transparent"
          )}
          style={{ backgroundColor: CATEGORY_COLORS[key].fg }}
        />
      ))}
    </div>
  );
}

/** "הקטגוריות שלי" — personal categories, owned by `userId` only. */
export default function CategoriesSettings({ userId }: { userId: string }) {
  const { categories, tasks, addCategory, updateCategory, removeCategory, getTaskCategory } = useTaskStore();
  const mine = categories.filter((c) => c.userId === userId);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_KEYS[0]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const nameError = (name: string, exceptId?: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return "צריך לתת שם לקטגוריה";
    if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) return `עד ${MAX_CATEGORY_NAME_LENGTH} תווים`;
    if (mine.some((c) => c.id !== exceptId && c.name.trim() === trimmed)) return "כבר יש לך קטגוריה בשם הזה";
    return null;
  };

  const handleAdd = () => {
    if (mine.length >= MAX_CATEGORIES) return setError(`אפשר עד ${MAX_CATEGORIES} קטגוריות`);
    const err = nameError(newName);
    if (err) return setError(err);
    addCategory(userId, newName, newColor);
    setNewName("");
    // Rotate to the next color so consecutive new categories don't all look the same.
    setNewColor(COLOR_KEYS[(COLOR_KEYS.indexOf(newColor) + 1) % COLOR_KEYS.length]);
    setError(null);
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditName(c.name);
    setConfirmDeleteId(null);
    setError(null);
  };

  const commitRename = (c: Category) => {
    const err = nameError(editName, c.id);
    if (err) return setError(err);
    if (editName.trim() !== c.name) updateCategory(c.id, { name: editName });
    setEditingId(null);
    setError(null);
  };

  // Swap sort orders with the neighbor; reassigning by index also repairs any duplicate sort_order values.
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= mine.length) return;
    const reordered = [...mine];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    reordered.forEach((c, i) => {
      if (c.sortOrder !== i) updateCategory(c.id, { sortOrder: i });
    });
  };

  const usageCount = (categoryId: string) => tasks.filter((t) => getTaskCategory(t.id, userId)?.id === categoryId).length;

  return (
    <section>
      <p className="mb-1 text-sm font-bold text-ink dark:text-ink-dark">הקטגוריות שלי</p>
      <p className="mb-2 text-[11px] leading-snug text-ink-soft dark:text-ink-dark-soft">
        סדר/י את המשימות שלך לפי נושאים. הקטגוריות אישיות — רק את/ה רואה אותן, גם במשימות משותפות.
      </p>

      {mine.length > 0 && (
        <ul className="mb-3 space-y-2">
          {mine.map((c, i) => {
            const colors = CATEGORY_COLORS[c.color] ?? CATEGORY_COLORS.blue;
            const editing = editingId === c.id;
            return (
              <li key={c.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: colors.fg }} />
                  {editing ? (
                    <input
                      autoFocus
                      value={editName}
                      maxLength={MAX_CATEGORY_NAME_LENGTH}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(c);
                        if (e.key === "Escape") {
                          e.preventDefault(); // cancels this edit only — not the sheet it sits in
                          setEditingId(null);
                        }
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-2 py-1 text-sm text-ink dark:text-ink-dark outline-none focus:border-brand-500"
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(c)}
                      className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-ink dark:text-ink-dark"
                    >
                      {c.name}
                    </button>
                  )}
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="הזזה למעלה"
                    className="rounded-full p-1 text-ink-soft disabled:opacity-25"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === mine.length - 1}
                    aria-label="הזזה למטה"
                    className="rounded-full p-1 text-ink-soft disabled:opacity-25"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(confirmDeleteId === c.id ? null : c.id)}
                    aria-label="מחיקת הקטגוריה"
                    className="rounded-full p-1 text-rose-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {editing && (
                  <div className="mt-2.5 space-y-2.5">
                    <ColorRow value={c.color} onPick={(color) => updateCategory(c.id, { color })} />
                    <div className="flex gap-2">
                      <button
                        onClick={() => commitRename(c)}
                        className="rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white"
                      >
                        שמירה
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3.5 py-1.5 text-xs font-bold text-ink-soft dark:text-ink-dark-soft"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {confirmDeleteId === c.id && (
                  <div className="mt-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 p-2.5">
                    <p className="mb-2 text-xs text-rose-700 dark:text-rose-300">
                      {(() => {
                        const n = usageCount(c.id);
                        return n > 0
                          ? `למחוק את "${c.name}"? ${n} משימות יעברו ל"ללא קטגוריה" (המשימות עצמן לא נמחקות).`
                          : `למחוק את "${c.name}"?`;
                      })()}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          removeCategory(c.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white"
                      >
                        מחיקה
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-full bg-white dark:bg-zinc-800 px-3.5 py-1.5 text-xs font-bold text-ink-soft dark:text-ink-dark-soft"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {mine.length < MAX_CATEGORIES ? (
        <div className="space-y-2.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-2.5">
          <div className="flex gap-2">
            <input
              value={newName}
              maxLength={MAX_CATEGORY_NAME_LENGTH}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="קטגוריה חדשה, למשל: אישי"
                aria-label="קטגוריה חדשה, למשל: אישי"
              className="min-w-0 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-ink dark:text-ink-dark outline-none focus:border-brand-500"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex shrink-0 items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              <Plus size={14} />
              הוספה
            </button>
          </div>
          <ColorRow value={newColor} onPick={setNewColor} />
        </div>
      ) : (
        <p className="text-[11px] text-ink-soft dark:text-ink-dark-soft">הגעת למקסימום של {MAX_CATEGORIES} קטגוריות.</p>
      )}

      {error && <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-400">{error}</p>}
    </section>
  );
}
