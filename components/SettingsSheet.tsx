"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Settings, Sun, Moon, MonitorSmartphone, Image as ImageIcon, Trash2, Loader2, Clock } from "lucide-react";
import { useTaskStore } from "@/lib/store";
import { TeamMember } from "@/lib/types";
import { getStoredTheme, setTheme, ThemePreference } from "@/lib/theme";
import { uploadBackground, removeBackground } from "@/lib/background";
import { BACKGROUND_PRESETS } from "@/lib/backgroundPresets";

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "לפי המערכת", icon: MonitorSmartphone },
  { value: "light", label: "בהיר", icon: Sun },
  { value: "dark", label: "כהה", icon: Moon },
];

const INTERVAL_OPTIONS: { value: number; label: string }[] = [
  { value: 30, label: "כל 30 דקות" },
  { value: 60, label: "כל שעה" },
  { value: 240, label: "כל 4 שעות" },
  { value: 1440, label: "פעם ביום" },
];

export default function SettingsSheet({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member: TeamMember;
}) {
  const { updateMember } = useTaskStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [theme, setThemeState] = useState<ThemePreference>("system");
  useEffect(() => {
    if (open) setThemeState(getStoredTheme());
  }, [open]);

  const [reminderEnabled, setReminderEnabled] = useState(!!member.dailySummaryEnabled);
  const [reminderTime, setReminderTime] = useState(member.dailySummaryTime || "14:00");
  const [reminderScope, setReminderScope] = useState<"all" | "due_soon">(member.dailySummaryScope || "all");
  useEffect(() => {
    setReminderEnabled(!!member.dailySummaryEnabled);
    setReminderTime(member.dailySummaryTime || "14:00");
    setReminderScope(member.dailySummaryScope || "all");
  }, [member.dailySummaryEnabled, member.dailySummaryTime, member.dailySummaryScope]);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(!!member.workingHoursEnabled);
  const [workingHoursStart, setWorkingHoursStart] = useState(member.workingHoursStart || "08:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState(member.workingHoursEnd || "18:00");
  const [intervalMinutes, setIntervalMinutes] = useState(member.overdueReminderIntervalMinutes ?? 1440);
  useEffect(() => {
    setWorkingHoursEnabled(!!member.workingHoursEnabled);
    setWorkingHoursStart(member.workingHoursStart || "08:00");
    setWorkingHoursEnd(member.workingHoursEnd || "18:00");
    setIntervalMinutes(member.overdueReminderIntervalMinutes ?? 1440);
  }, [member.workingHoursEnabled, member.workingHoursStart, member.workingHoursEnd, member.overdueReminderIntervalMinutes]);

  const handleThemeChange = (value: ThemePreference) => {
    setThemeState(value);
    setTheme(value);
  };

  const handleReminderToggle = () => {
    const next = !reminderEnabled;
    setReminderEnabled(next);
    updateMember(member.id, { dailySummaryEnabled: next, dailySummaryTime: reminderTime, dailySummaryScope: reminderScope });
  };

  const handleReminderTime = (value: string) => {
    setReminderTime(value);
    if (reminderEnabled) updateMember(member.id, { dailySummaryTime: value });
  };

  const handleReminderScope = (value: "all" | "due_soon") => {
    setReminderScope(value);
    if (reminderEnabled) updateMember(member.id, { dailySummaryScope: value });
  };

  const handlePickBackground = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const result = await uploadBackground(member.id, file);
    setUploading(false);
    if ("error" in result) {
      setUploadError(result.error);
      return;
    }
    // An uploaded photo and a preset gradient are mutually exclusive — picking
    // one clears the other so there's never ambiguity about which shows.
    updateMember(member.id, { backgroundUrl: result.url, backgroundPreset: null });
  };

  const handleRemoveBackground = async () => {
    setUploadError(null);
    const hadUploadedImage = !!member.backgroundUrl;
    updateMember(member.id, { backgroundUrl: null, backgroundPreset: null });
    if (hadUploadedImage) await removeBackground(member.id);
  };

  const handlePickPreset = (key: string) => {
    setUploadError(null);
    updateMember(member.id, { backgroundPreset: key, backgroundUrl: null });
  };

  const handleWorkingHoursToggle = () => {
    const next = !workingHoursEnabled;
    setWorkingHoursEnabled(next);
    updateMember(member.id, { workingHoursEnabled: next, workingHoursStart, workingHoursEnd });
  };

  const handleWorkingHoursStart = (value: string) => {
    setWorkingHoursStart(value);
    if (workingHoursEnabled) updateMember(member.id, { workingHoursStart: value });
  };

  const handleWorkingHoursEnd = (value: string) => {
    setWorkingHoursEnd(value);
    if (workingHoursEnabled) updateMember(member.id, { workingHoursEnd: value });
  };

  const handleIntervalChange = (value: number) => {
    setIntervalMinutes(value);
    updateMember(member.id, { overdueReminderIntervalMinutes: value });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="sheet-scroll fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-surface-dark-card px-5 pb-8 pt-3 shadow-2xl md:bottom-6 md:mx-auto md:max-w-lg md:rounded-3xl"
          >
            <div className="flex justify-center pb-3">
              <div className="h-1.5 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>

            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-500 to-zinc-700 text-white shadow-soft">
                  <Settings size={18} />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-ink dark:text-ink-dark">הגדרות</h2>
                  <p className="text-xs text-ink-soft dark:text-ink-dark-soft">אישי — משפיע רק על החשבון שלך</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-ink-soft hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="סגור"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Appearance */}
              <section>
                <p className="mb-2 text-sm font-bold text-ink dark:text-ink-dark">מראה</p>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleThemeChange(value)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors ${
                        theme === value
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                          : "border-zinc-200 dark:border-zinc-700 text-ink-soft dark:text-ink-dark-soft"
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Background */}
              <section>
                <p className="mb-1 text-sm font-bold text-ink dark:text-ink-dark">רקע</p>
                <p className="mb-2 text-[11px] leading-snug text-ink-soft dark:text-ink-dark-soft">
                  העלה תמונה מהמכשיר שלך כרקע לאפליקציה, בסגנון רקע אישי לוואטסאפ.
                </p>

                {(member.backgroundUrl || member.backgroundPreset) && (
                  <div
                    className="relative mb-2 h-28 w-full overflow-hidden rounded-2xl ring-1 ring-black/5 dark:ring-white/10"
                    style={
                      member.backgroundUrl
                        ? undefined
                        : { backgroundImage: BACKGROUND_PRESETS.find((p) => p.key === member.backgroundPreset)?.css }
                    }
                  >
                    {member.backgroundUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary remote URL, not worth next/image config here
                      <img src={member.backgroundUrl} alt="הרקע הנוכחי" className="h-full w-full object-cover" />
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handlePickBackground}
                    disabled={uploading}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-ink dark:text-ink-dark disabled:opacity-60"
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                    {uploading ? "מעלה..." : member.backgroundUrl ? "החלף תמונה" : "בחר תמונה משלך"}
                  </button>
                  {(member.backgroundUrl || member.backgroundPreset) && (
                    <button
                      onClick={handleRemoveBackground}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
                      aria-label="הסרת הרקע"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {uploadError && <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">{uploadError}</p>}

                <p className="mb-1.5 mt-3 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">או בחר צבע מוכן</p>
                <div className="grid grid-cols-6 gap-2">
                  {BACKGROUND_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => handlePickPreset(preset.key)}
                      aria-label={preset.label}
                      title={preset.label}
                      style={{ backgroundImage: preset.css }}
                      className={`aspect-square rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-surface-dark-card transition-all ${
                        member.backgroundPreset === preset.key && !member.backgroundUrl
                          ? "ring-brand-500 scale-95"
                          : "ring-transparent"
                      }`}
                    />
                  ))}
                </div>
              </section>

              {/* Daily open-tasks reminder */}
              <section>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-ink dark:text-ink-dark">תזכורת יומית</p>
                  <button
                    role="switch"
                    aria-checked={reminderEnabled}
                    onClick={handleReminderToggle}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      reminderEnabled ? "bg-brand-500" : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        reminderEnabled ? "translate-x-0.5" : "translate-x-5"
                      }`}
                    />
                  </button>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-ink-soft dark:text-ink-dark-soft">
                  התראה יומית אם יש לך משימות פתוחות — כבוי כברירת מחדל, אתה שולט לגמרי מתי ואם היא תישלח.
                </p>

                <div className={reminderEnabled ? "mt-3 space-y-3" : "mt-3 space-y-3 opacity-40 pointer-events-none"}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-soft dark:text-ink-dark-soft">בשעה</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => handleReminderTime(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm text-ink dark:text-ink-dark"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-soft dark:text-ink-dark-soft">על אילו משימות</label>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 text-xs text-ink dark:text-ink-dark">
                        <input
                          type="radio"
                          name={`daily-summary-scope-${member.id}`}
                          checked={reminderScope === "all"}
                          onChange={() => handleReminderScope("all")}
                        />
                        כל המשימות הפתוחות שלי
                      </label>
                      <label className="flex items-center gap-2 text-xs text-ink dark:text-ink-dark">
                        <input
                          type="radio"
                          name={`daily-summary-scope-${member.id}`}
                          checked={reminderScope === "due_soon"}
                          onChange={() => handleReminderScope("due_soon")}
                        />
                        רק כאלה עם דדליין היום או שעבר
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* Deadline reminders: working hours + repeat interval */}
              <section>
                <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ink dark:text-ink-dark">
                  <Clock size={14} className="text-ink-soft dark:text-ink-dark-soft" />
                  תזכורות דדליין/חריגה
                </p>
                <p className="mb-2 text-[11px] leading-snug text-ink-soft dark:text-ink-dark-soft">
                  שולט מתי ובאיזו תדירות תקבל התראות על משימות שהדדליין שלהן היום או שעבר.
                </p>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
                    תדירות חזרה על תזכורת חורגת
                  </label>
                  <select
                    value={intervalMinutes}
                    onChange={(e) => handleIntervalChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm text-ink dark:text-ink-dark"
                  >
                    {INTERVAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="text-black">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink dark:text-ink-dark">רק בשעות עבודה</p>
                    <p className="text-[11px] text-ink-soft dark:text-ink-dark-soft">א׳–ה׳ בלבד; מחוץ לשעון — התראה ממתינה עד לפתיחה הבאה</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={workingHoursEnabled}
                    onClick={handleWorkingHoursToggle}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      workingHoursEnabled ? "bg-brand-500" : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        workingHoursEnabled ? "translate-x-0.5" : "translate-x-5"
                      }`}
                    />
                  </button>
                </div>

                <div className={workingHoursEnabled ? "mt-3 grid grid-cols-2 gap-2" : "mt-3 grid grid-cols-2 gap-2 opacity-40 pointer-events-none"}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-soft dark:text-ink-dark-soft">משעה</label>
                    <input
                      type="time"
                      value={workingHoursStart}
                      onChange={(e) => handleWorkingHoursStart(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm text-ink dark:text-ink-dark"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-soft dark:text-ink-dark-soft">עד שעה</label>
                    <input
                      type="time"
                      value={workingHoursEnd}
                      onChange={(e) => handleWorkingHoursEnd(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-1.5 text-sm text-ink dark:text-ink-dark"
                    />
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
