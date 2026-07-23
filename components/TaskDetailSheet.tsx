"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { X, Calendar, Trash2, Send, Repeat, AlertTriangle, XCircle } from "lucide-react";
import { Task, TeamMember, TaskStatus, STATUS_LABELS, Priority, PRIORITY_COLORS } from "@/lib/types";
import { timeAgoHebrew } from "@/lib/utils";
import Avatar from "./Avatar";
import clsx from "clsx";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "stuck", "done", "cancelled"];
const PRIORITIES: Priority[] = [1, 2, 3, 4, 5];

export default function TaskDetailSheet({
  task,
  team,
  currentUserId,
  onClose,
  onUpdate,
  onDelete,
  onAddComment,
}: {
  task: Task | null;
  team: TeamMember[];
  currentUserId: string;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string, scope: "one" | "series") => void;
  onAddComment: (taskId: string, userId: string, text: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setAssigneeIds(new Set(task.assigneeIds));
      setDeadline(task.deadline);
      setPriority(task.priority);
      setStatus(task.status);
      setConfirmingDelete(false);
      setCommentText("");
    }
  }, [task]);

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setConfirmingDelete(false);
    onClose();
  };

  const handleSave = () => {
    if (!task || !title.trim() || assigneeIds.size === 0 || !deadline) return;
    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim(),
      assigneeIds: Array.from(assigneeIds),
      deadline,
      priority,
      status,
    });
    handleClose();
  };

  const handleDelete = (scope: "one" | "series") => {
    if (!task) return;
    onDelete(task.id, scope);
    handleClose();
  };

  const handleCancelTask = () => {
    if (!task) return;
    onUpdate(task.id, { status: "cancelled" });
    handleClose();
  };

  const handleSendComment = () => {
    if (!task || !commentText.trim()) return;
    onAddComment(task.id, currentUserId, commentText.trim());
    setCommentText("");
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100) handleClose();
  };

  const findMember = (id: string) => team.find((m) => m.id === id);

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-surface-dark-card px-5 pb-8 pt-3 shadow-2xl"
          >
            <div className="flex justify-center pb-3">
              <div className="bottom-sheet-handle" />
            </div>

            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink dark:text-ink-dark">פרטי משימה</h2>
              <button
                onClick={handleClose}
                aria-label="סגירה"
                className="rounded-full p-1.5 text-ink-soft hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            </div>

            {task.recurrenceId && (
              <p className="mb-4 flex items-center gap-1.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-300">
                <Repeat size={13} />
                חלק ממשימה חוזרת
              </p>
            )}

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">שם המשימה</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">תיאור</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink dark:text-ink-dark">אחראי/ת — אפשר כמה</label>
                <div className="flex flex-wrap gap-3">
                  {team.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleAssignee(m.id)}
                      className={clsx(
                        "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white text-xs transition-all active:scale-90",
                        m.colorFrom,
                        m.colorTo,
                        assigneeIds.has(m.id)
                          ? "ring-4 ring-offset-2 ring-brand-400 dark:ring-offset-surface-dark-card scale-105"
                          : "opacity-60 hover:opacity-100"
                      )}
                    >
                      {m.initials}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">דדליין</label>
                <div className="relative">
                  <Calendar size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 py-3 pr-11 pl-4 text-ink dark:text-ink-dark focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink dark:text-ink-dark">רמת דחיפות</label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => {
                    const c = PRIORITY_COLORS[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={clsx(
                          "flex-1 rounded-xl py-2.5 text-center text-xs font-bold transition-all active:scale-95",
                          priority === p ? "ring-2 ring-offset-1 ring-brand-400 dark:ring-offset-surface-dark-card" : "opacity-70"
                        )}
                        style={{ backgroundColor: c.bg, color: c.fg }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-center text-xs text-ink-soft dark:text-ink-dark-soft">
                  {PRIORITY_COLORS[priority].label} · 1 הכי דחוף, 5 הכי פחות
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-ink dark:text-ink-dark">סטטוס</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={clsx(
                        "rounded-full px-3.5 py-2 text-xs font-bold transition-all active:scale-95",
                        status === s
                          ? "bg-brand-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-ink-soft dark:text-ink-dark-soft"
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={!title.trim() || assigneeIds.size === 0 || !deadline}
                className="w-full rounded-2xl bg-brand-600 py-3.5 font-bold text-white shadow-soft transition-all active:scale-[0.98] disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
              >
                שמירת שינויים
              </button>

              {/* Quick cancel — marks the task cancelled without deleting it */}
              {task.status !== "cancelled" && task.status !== "done" && (
                <button
                  onClick={handleCancelTask}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 py-3 text-sm font-bold text-ink-soft dark:text-ink-dark-soft transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <XCircle size={15} />
                  ביטול משימה
                </button>
              )}

              {/* Delete */}
              {!confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-rose-200 dark:border-rose-500/30 py-3 text-sm font-bold text-rose-600 dark:text-rose-300 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <Trash2 size={15} />
                  מחיקת משימה
                </button>
              ) : (
                <div className="space-y-2 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-300">
                    <AlertTriangle size={13} />
                    האם למחוק?
                  </p>
                  <button
                    onClick={() => handleDelete("one")}
                    className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white active:scale-[0.98] transition-transform"
                  >
                    {task.recurrenceId ? "מחיקת המשימה הזו בלבד" : "מחיקה"}
                  </button>
                  {task.recurrenceId && (
                    <button
                      onClick={() => handleDelete("series")}
                      className="w-full rounded-xl border border-rose-300 dark:border-rose-500/40 py-2.5 text-sm font-bold text-rose-600 dark:text-rose-300 active:scale-[0.98] transition-transform"
                    >
                      ביטול כל הסדרה החוזרת
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="w-full text-center text-xs font-medium text-ink-soft dark:text-ink-dark-soft"
                  >
                    ביטול
                  </button>
                </div>
              )}

              {/* Comments */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5">
                <p className="mb-3 text-sm font-semibold text-ink dark:text-ink-dark">הערות</p>
                <div className="mb-3 space-y-3">
                  {(task.comments ?? []).length === 0 && (
                    <p className="text-xs text-ink-soft dark:text-ink-dark-soft">אין הערות עדיין</p>
                  )}
                  {(task.comments ?? []).map((c) => {
                    const author = findMember(c.userId);
                    if (!author) return null;
                    return (
                      <div key={c.id} className="flex items-start gap-2.5">
                        <Avatar member={author} size="sm" />
                        <div className="min-w-0 flex-1 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-xs font-bold text-ink dark:text-ink-dark">{author.name}</p>
                            <p className="shrink-0 text-[10px] text-ink-soft dark:text-ink-dark-soft">
                              {timeAgoHebrew(c.timestamp)}
                            </p>
                          </div>
                          <p className="mt-0.5 text-sm text-ink dark:text-ink-dark">{c.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                    placeholder="הוספת הערה..."
                    className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-2.5 text-sm text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                  />
                  <button
                    onClick={handleSendComment}
                    disabled={!commentText.trim()}
                    aria-label="שליחת הערה"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-all active:scale-90 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-ink-soft dark:text-ink-dark-soft">
                  הערה חדשה שולחת התראה למפקדת
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
