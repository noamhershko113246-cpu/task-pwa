"use client";

import { useState } from "react";
import { Check, Lock, Plus, ChevronUp, ChevronDown, Trash2, Pencil, PartyPopper } from "lucide-react";
import { TeamMember, StepDraft, MAX_STEPS, MAX_STEP_LENGTH } from "@/lib/types";
import { firstName, formatCreatedAt } from "@/lib/utils";
import clsx from "clsx";

/**
 * Ordered, locked checklist. Ticking/unticking a step is saved immediately (onToggleStep); edits to
 * the list itself (add/rename/delete/reorder) are a DRAFT owned by the task sheet, saved with the
 * sheet's "save". Only the current step (first open one) can be checked, and only the last finished
 * one unchecked, so done steps are always a prefix of the list. The list itself
 * (add/rename/delete/reorder) is editable only when `editable` (the task's creator).
 */
export default function TaskStepsChecklist({
  draft,
  onChange,
  dirty,
  editable,
  taskOpen,
  team,
  currentUserId,
  onStarted,
  onMarkTaskDone,
  onToggleStep,
}: {
  draft: StepDraft[];
  onChange: (next: StepDraft[]) => void;
  dirty: boolean;
  editable: boolean;
  taskOpen: boolean;
  team: TeamMember[];
  currentUserId: string;
  /** Fired when checking a step should move a "todo" task to in_progress — the sheet updates its status field. */
  onStarted: () => void;
  onMarkTaskDone: () => void;
  /** Persists a tick/untick of a saved step immediately (see handleToggle). */
  onToggleStep?: (stepId: string, done: boolean) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  // Nothing to show to someone who can't add steps.
  if (draft.length === 0 && !editable) return null;

  const currentIndex = draft.findIndex((s) => !s.isDone);
  const lastDoneIndex = currentIndex === -1 ? draft.length - 1 : currentIndex - 1;
  const doneCount = draft.filter((s) => s.isDone).length;
  const allDone = draft.length > 0 && doneCount === draft.length;

  // Ticking / unticking a SAVED step is persisted right away through onToggleStep (so closing the
  // sheet never loses progress). A step that was only just added and isn't saved yet has no id to
  // write against, so it falls back to the draft and is committed with the sheet's "save".
  const handleToggle = (index: number) => {
    const step = draft[index];
    const check = index === currentIndex;
    if (!check && index !== lastDoneIndex) return;
    if (check && doneCount === 0) onStarted();
    if (step.id && onToggleStep) {
      onToggleStep(step.id, check);
      return;
    }
    onChange(
      draft.map((s, i) =>
        i === index
          ? check
            ? { ...s, isDone: true, doneBy: currentUserId, doneAt: new Date().toISOString() }
            : { ...s, isDone: false, doneBy: undefined, doneAt: undefined }
          : s
      )
    );
  };

  const handleAdd = () => {
    const title = newStep.trim();
    if (!title || draft.length >= MAX_STEPS) return;
    onChange([...draft, { key: `new-${Date.now()}-${draft.length}`, title, isDone: false }]);
    setNewStep("");
  };

  // Done steps must stay a prefix of the list (that's what makes the order lock work), so only
  // open steps can move, and only among other open steps.
  const canMove = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    return target >= 0 && target < draft.length && !draft[index].isDone && !draft[target].isDone;
  };

  const move = (index: number, dir: -1 | 1) => {
    if (!canMove(index, dir)) return;
    const next = [...draft];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    onChange(next);
  };

  const commitRename = () => {
    const title = renameText.trim();
    if (renamingKey && title) onChange(draft.map((s) => (s.key === renamingKey ? { ...s, title } : s)));
    setRenamingKey(null);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-ink dark:text-ink-dark">
          שלבים
          {draft.length > 0 && (
            <span className="mr-1.5 font-normal text-ink-soft dark:text-ink-dark-soft">
              {doneCount}/{draft.length}
            </span>
          )}
        </label>
        {editable && draft.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setEditMode((v) => !v);
              setRenamingKey(null);
            }}
            className="flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-300"
          >
            <Pencil size={12} />
            {editMode ? "סיום עריכה" : "עריכת שלבים"}
          </button>
        )}
      </div>

      {draft.length > 0 && (
        <ol className="space-y-1.5">
          {draft.map((s, i) => {
            const isCurrent = i === currentIndex;
            const locked = !s.isDone && !isCurrent;
            const canUncheck = s.isDone && i === lastDoneIndex;
            const doneByName = s.doneBy ? firstName(team.find((m) => m.id === s.doneBy)?.name ?? "") : "";
            return (
              <li
                key={s.key}
                className={clsx(
                  "flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
                  isCurrent && !editMode
                    ? "border border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                    : "bg-zinc-50 dark:bg-zinc-800/60"
                )}
              >
                {editMode ? (
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-[11px] font-bold text-ink-soft">
                    {i + 1}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggle(i)}
                    disabled={locked || (s.isDone && !canUncheck)}
                    aria-label={s.isDone ? "ביטול סימון השלב" : locked ? "השלב נעול" : "סימון השלב כהושלם"}
                    className={clsx(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90",
                      s.isDone && "border-emerald-500 bg-emerald-500",
                      isCurrent && "border-brand-500 hover:bg-brand-100 dark:hover:bg-brand-500/20",
                      locked && "border-zinc-300 dark:border-zinc-600 cursor-not-allowed"
                    )}
                  >
                    {s.isDone ? (
                      <Check size={13} strokeWidth={3} className="text-white" />
                    ) : locked ? (
                      <Lock size={11} className="text-zinc-500 dark:text-zinc-400" />
                    ) : null}
                  </button>
                )}

                <div className="min-w-0 flex-1">
                  {renamingKey === s.key ? (
                    <input
                      autoFocus
                      value={renameText}
                      maxLength={MAX_STEP_LENGTH}
                      onChange={(e) => setRenameText(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur(); // commits once, via onBlur
                        if (e.key === "Escape") {
                          e.preventDefault(); // cancels this rename only — not the sheet it sits in
                          setRenamingKey(null);
                        }
                      }}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-ink dark:text-ink-dark outline-none focus:border-brand-500"
                    />
                  ) : (
                    <p
                      onClick={() => {
                        if (!editMode) return;
                        setRenamingKey(s.key);
                        setRenameText(s.title);
                      }}
                      className={clsx(
                        "text-sm leading-snug",
                        s.isDone && "text-ink-soft line-through dark:text-ink-dark-soft",
                        isCurrent && "font-semibold text-ink dark:text-ink-dark",
                        locked && "text-ink-soft dark:text-ink-dark-soft",
                        editMode && "cursor-text"
                      )}
                    >
                      {s.title}
                    </p>
                  )}
                  {s.isDone && s.doneAt && !editMode && (
                    <p className="mt-0.5 text-[10px] text-ink-soft dark:text-ink-dark-soft">
                      {doneByName ? `${doneByName} · ` : ""}
                      {formatCreatedAt(s.doneAt)}
                    </p>
                  )}
                  {isCurrent && !editMode && (
                    <p className="mt-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-300">השלב הנוכחי</p>
                  )}
                </div>

                {editMode && (
                  <div className="flex shrink-0 items-center">
                    <button type="button" onClick={() => move(i, -1)} disabled={!canMove(i, -1)} aria-label="הזזה למעלה" className="p-1 text-ink-soft disabled:opacity-25">
                      <ChevronUp size={15} />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={!canMove(i, 1)} aria-label="הזזה למטה" className="p-1 text-ink-soft disabled:opacity-25">
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(draft.filter((x) => x.key !== s.key))}
                      aria-label="מחיקת השלב"
                      className="p-1 text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {dirty && (
        <p className="mt-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
          יש שינויים בשלבים — הם יישמרו בלחיצה על &quot;שמירה&quot;
        </p>
      )}

      {allDone && taskOpen && !editMode && (
        <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5">
          <PartyPopper size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="min-w-0 flex-1 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            כל השלבים הושלמו! לשמור ולסמן את המשימה כהושלמה?
          </p>
          <button
            type="button"
            onClick={onMarkTaskDone}
            className="shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            סימון כהושלמה
          </button>
        </div>
      )}

      {editable && (draft.length === 0 || editMode) && draft.length < MAX_STEPS && (
        <div className="mt-2 flex gap-2">
          <input
            value={newStep}
            maxLength={MAX_STEP_LENGTH}
            onChange={(e) => setNewStep(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={draft.length === 0 ? "חלק/י את המשימה לשלבים — שלב ראשון..." : `שלב ${draft.length + 1}...`}
            aria-label="הוספת שלב למשימה"
            className="min-w-0 flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-2.5 text-sm text-ink dark:text-ink-dark outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newStep.trim()}
            className="flex shrink-0 items-center gap-1 rounded-2xl bg-brand-600 px-3.5 text-xs font-bold text-white disabled:opacity-40"
          >
            <Plus size={14} />
            הוספה
          </button>
        </div>
      )}
    </div>
  );
}
