"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, UserPlus, Trash2, Phone, AlertTriangle } from "lucide-react";
import { getSession } from "@/lib/auth";
import { useTaskStore } from "@/lib/store";
import AppHeader from "@/components/AppHeader";
import Avatar from "@/components/Avatar";
import RoleBadge from "@/components/RoleBadge";
import LoadingScreen from "@/components/LoadingScreen";

export default function TeamManagementPage() {
  const router = useRouter();
  const { team, tasks, loading, addMember, removeMember } = useTaskStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  // Auth guard: only a logged-in manager may see this screen.
  useEffect(() => {
    if (loading) return; // wait for team data before deciding
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const sessionMember = team.find((m) => m.id === session.userId);
    if (!sessionMember?.isManager) {
      router.replace(`/staff?user=${session.userId}`);
    }
  }, [router, team, loading]);

  if (loading) return <LoadingScreen />;

  const soldiers = team.filter((m) => !m.isManager);

  const handleAdd = () => {
    setError("");
    if (!name.trim() || !phone.trim()) {
      setError("יש למלא שם ומספר טלפון");
      return;
    }
    const digits = phone.replace(/[^\d]/g, "");
    if (digits.length < 9) {
      setError("מספר הטלפון לא תקין");
      return;
    }
    if (team.some((m) => m.phone.replace(/[^\d]/g, "") === digits)) {
      setError("מספר הטלפון הזה כבר קיים במערכת");
      return;
    }
    addMember(name.trim(), phone.trim());
    setName("");
    setPhone("");
  };

  const handleRemove = (id: string) => {
    removeMember(id);
    setConfirmingRemoveId(null);
  };

  const taskCountFor = (id: string) => tasks.filter((t) => t.assigneeIds.includes(id)).length;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-10 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <AppHeader title="ניהול צוות" subtitle="הוספה והסרה של חיילים" />
        <Link
          href="/manager"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
          aria-label="חזרה"
        >
          <ChevronRight size={18} className="text-ink-soft" />
        </Link>
      </header>

      {/* Add new soldier */}
      <section className="mb-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-5 shadow-card">
        <p className="mb-4 flex items-center gap-1.5 text-sm font-bold text-ink dark:text-ink-dark">
          <UserPlus size={16} />
          הוספת חייל/ת
        </p>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם מלא"
            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
          />
          <div className="relative">
            <Phone size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="מספר טלפון (05X-XXXXXXX)"
              inputMode="numeric"
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 py-3 pr-11 pl-4 text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 focus:bg-white dark:focus:bg-zinc-800 outline-none transition-colors"
            />
          </div>
          {error && <p className="text-sm font-medium text-rose-500">{error}</p>}
          <button
            onClick={handleAdd}
            className="w-full rounded-2xl bg-brand-600 py-3 font-bold text-white shadow-soft transition-all active:scale-[0.98]"
          >
            הוספה לצוות
          </button>
        </div>
      </section>

      {/* Current team */}
      <section>
        <p className="mb-3 px-1 text-sm font-bold text-ink dark:text-ink-dark">
          חברי הצוות ({soldiers.length})
        </p>
        <div className="space-y-2.5">
          {soldiers.map((member) => (
            <div
              key={member.id}
              className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-3.5 shadow-card"
            >
              <div className="flex items-center gap-3">
                <Avatar member={member} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-ink dark:text-ink-dark">{member.name}</p>
                    <RoleBadge member={member} />
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft dark:text-ink-dark-soft" dir="ltr">
                    {member.phone} · {taskCountFor(member.id)} משימות
                  </p>
                </div>
                {confirmingRemoveId !== member.id && (
                  <button
                    onClick={() => setConfirmingRemoveId(member.id)}
                    aria-label={`הסרת ${member.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {confirmingRemoveId === member.id && (
                <div className="mt-3 space-y-2 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-300">
                    <AlertTriangle size={13} />
                    להסיר את {member.name}? {taskCountFor(member.id)} המשימות שלו/ה יימחקו גם כן.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white active:scale-[0.98] transition-transform"
                    >
                      הסרה
                    </button>
                    <button
                      onClick={() => setConfirmingRemoveId(null)}
                      className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-bold text-ink-soft dark:text-ink-dark-soft active:scale-[0.98] transition-transform"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {soldiers.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-soft dark:text-ink-dark-soft">אין עדיין חברי צוות</p>
          )}
        </div>
      </section>
    </main>
  );
}
