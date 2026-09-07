"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, PanInfo, useDragControls } from "framer-motion";
import { X, Trash2, Send, Repeat, AlertTriangle, XCircle, Paperclip, FileText, Download, Loader2 } from "lucide-react";
import { Task, TeamMember, TaskStatus, STATUS_LABELS, Priority, PRIORITY_COLORS } from "@/lib/types";
import { timeAgoHebrew, toDatetimeLocalValue, firstName } from "@/lib/utils";
import { uploadTaskAttachment, isImageAttachment, formatFileSize } from "@/lib/attachments";
import Avatar from "./Avatar";
import clsx from "clsx";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "stuck", "done", "cancelled"];
const PRIORITIES: Priority[] = [1, 2, 3, 4, 5];

export default function TaskDetailSheet({
  task,
  team,
  assignableTeam,
  currentUserId,
  onClose,
  onUpdate,
  onDelete,
  onAddComment,
  onAddAttachment,
  onRemoveAttachment,
}: {
  task: Task | null;
  team: TeamMember[]; // full roster — used to resolve names/avatars for comments etc.
  assignableTeam?: TeamMember[]; // who can actually be picked as an assignee — defaults to `team`
  currentUserId: string;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string, scope: "one" | "series") => void;
  onAddComment: (taskId: string, userId: string, text: string) => void;
  onAddAttachment?: (taskId: string, userId: string, file: { url: string; fileName: string; mimeType: string; sizeBytes: number }) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
}) {
  const pickerTeam = assignableTeam ?? team;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

  // Re-initializes the editable fields only when a *different* task is opened (by id),
  // not on every store update — `task` itself is now looked up live from the store, so
  // reacting to every reference change would wipe out whatever you're mid-typing the
  // instant someone else's unrelated change (or even a new comment on THIS task)
  // comes in over realtime. Read-only bits below (comments, creator, recurrence badge,
  // the quick-cancel button's visibility) read straight from `task`, so they still
  // update live while the sheet is open — only the edit form itself is "frozen" per view.
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setAssigneeIds(new Set(task.assigneeIds));
      setDeadline(toDatetimeLocalValue(task.deadline));
      setPriority(task.priority);
      setStatus(task.status);
      setConfirmingDelete(false);
      setCommentText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

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
    if (!task || !title.trim() || assigneeIds.size === 0) return;
    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim(),
      assigneeIds: Array.from(assigneeIds),
      deadline: deadline ? new Date(deadline).toISOString() : null,
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

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !task) return;
    setUploadingFile(true);
    setFileError(null);
    const result = await uploadTaskAttachment(task.id, file);
    setUploadingFile(false);
    if ("error" in result) {
      setFileError(result.error);
      return;
    }
    onAddAttachment?.(task.id, currentUserId, result);
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
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="sheet-scroll fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-surface-dark-card px-5 pb-8 pt-3 shadow-2xl md:bottom-6 md:mx-auto md:max-w-lg md:rounded-3xl"
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex cursor-grab justify-center pb-3 active:cursor-grabbing"
            >
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

            {task.createdBy && (() => {
              const creator = team.find((m) => m.id === task.createdBy);
              if (!creator) return null;
              const isSelfAssigned = task.assigneeIds.length === 1 && task.assigneeIds[0] === creator.id;
              return (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2">
                  <Avatar member={creator} size="sm" />
                  <p className="text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
                    {isSelfAssigned ? (
                      <>
                        <span className="font-bold text-ink dark:text-ink-dark">{creator.name}</span> קבע/ה לעצמו/ה
                      </>
                    ) : (
                      <>
                        נקבעה על ידי <span className="font-bold text-ink dark:text-ink-dark">{creator.name}</span>
                      </>
                    )}
                  </p>
                </div>
              );
            })()}

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
                  {pickerTeam.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggleAssignee(m.id)}
                      className={clsx(
                        "flex h-11 min-w-[3.25rem] items-center justify-center rounded-full bg-gradient-to-br px-3 font-bold text-white text-xs transition-all active:scale-90",
                        m.colorFrom,
                        m.colorTo,
                        assigneeIds.has(m.id)
                          ? "ring-4 ring-offset-2 ring-brand-400 dark:ring-offset-surface-dark-card scale-105"
                          : "opacity-60 hover:opacity-100"
                      )}
                    >
                      {firstName(m.name)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                  דדליין (תאריך ושעה) — לא חובה
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                      } catch {
                        // showPicker isn't supported everywhere — clicking the native icon still works
                      }
                    }}
                    className="w-full cursor-pointer rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
                  />
                  {deadline && (
                    <button
                      type="button"
                      onClick={() => setDeadline("")}
                      aria-label="הסרת דדליין"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <X size={16} />
                    </button>
                  )}
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
                disabled={!title.trim() || assigneeIds.size === 0}
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

              {/* Attachments */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-ink-dark">
                  <Paperclip size={14} />
                  קבצים מצורפים
                </p>
                {(task.attachments ?? []).length > 0 && (
                  <div className="mb-3 space-y-2">
                    {(task.attachments ?? []).map((a) => {
                      const uploader = a.uploadedBy ? findMember(a.uploadedBy) : undefined;
                      return isImageAttachment(a.mimeType) ? (
                        <a
                          key={a.id}
                          href={a.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative block overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary remote URL */}
                          <img src={a.fileUrl} alt={a.fileName} className="h-32 w-full object-cover" />
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              onRemoveAttachment?.(a.id);
                            }}
                            aria-label="הסרת הקובץ"
                            className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X size={14} />
                          </button>
                        </a>
                      ) : (
                        <div
                          key={a.id}
                          className="flex items-center gap-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2.5"
                        >
                          <FileText size={18} className="shrink-0 text-ink-soft dark:text-ink-dark-soft" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ink dark:text-ink-dark">{a.fileName}</p>
                            <p className="text-[10px] text-ink-soft dark:text-ink-dark-soft">
                              {formatFileSize(a.sizeBytes)}
                              {uploader ? ` · ${uploader.name}` : ""}
                            </p>
                          </div>
                          <a
                            href={a.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="הורדה"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft dark:text-ink-dark-soft hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          >
                            <Download size={15} />
                          </a>
                          <button
                            onClick={() => onRemoveAttachment?.(a.id)}
                            aria-label="הסרת הקובץ"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  onClick={handlePickFile}
                  disabled={uploadingFile}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-600 py-2.5 text-xs font-semibold text-ink-soft dark:text-ink-dark-soft disabled:opacity-60"
                >
                  {uploadingFile ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  {uploadingFile ? "מעלה..." : "הוספת קובץ או תמונה"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {fileError && <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">{fileError}</p>}
              </div>

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
