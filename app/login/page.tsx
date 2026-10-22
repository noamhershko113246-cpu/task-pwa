"use client";

import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, ArrowRight, Check, Lock } from "lucide-react";
import { useTaskStore } from "@/lib/store";
import type { TeamMember } from "@/lib/types";
import { setSession } from "@/lib/auth";
import LoadingScreen from "@/components/LoadingScreen";

export default function LoginPage() {
  useDocumentTitle("התחברות");
  const router = useRouter();
  const { team, loading } = useTaskStore();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  // Set once the name matches the super-admin: the screen then asks for that account's password.
  const [pendingAdmin, setPendingAdmin] = useState<TeamMember | null>(null);
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);

  if (loading) return <LoadingScreen />;

  const handleLogin = () => {
    setError("");
    const trimmed = name.trim();
    if (!trimmed) return;

    // Login is by name only now — every team member has a loginKeyword
    // (defaults to their own name) instead of a phone number + SMS code.
    const member = team.find((m) => m.loginKeyword && m.loginKeyword === trimmed);
    if (!member) {
      setError("לא זוהה משתמש בשם הזה. פנה/י למפקד/ת כדי שתוסיף/תוסיף אותך.");
      return;
    }

    // The super-admin account needs a password on top of the name (checked on the server).
    if (member.isSuperAdmin) {
      setPassword("");
      setPendingAdmin(member);
      return;
    }

    finishLogin(member);
  };

  const finishLogin = (member: TeamMember) => {
    setSession(member.id, rememberMe);
    router.push(member.isManager ? "/manager" : `/staff?user=${member.id}`);
  };

  const handlePassword = async () => {
    if (!pendingAdmin || !password || checking) return;
    setError("");
    setChecking(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        finishLogin(pendingAdmin);
        return;
      }
      setError(res.status === 429 ? "יותר מדי ניסיונות. נסו שוב בעוד דקה." : "הסיסמה שגויה.");
    } catch {
      setError("לא הצלחנו לבדוק את הסיסמה. בדקו את החיבור ונסו שוב.");
    } finally {
      setChecking(false);
    }
  };

  const backToName = () => {
    setPendingAdmin(null);
    setPassword("");
    setError("");
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center text-center"
      >
        <div className="relative h-24 w-24 overflow-hidden rounded-3xl shadow-card ring-1 ring-black/5 dark:ring-white/10">
          <Image src="/logo.png" alt="סמל היחידה" fill sizes="96px" className="object-cover" priority />
        </div>
        <div className="mt-3 flex h-1 w-20 overflow-hidden rounded-full">
          <span className="flex-1 bg-unit-red" />
          <span className="flex-1 bg-black dark:bg-zinc-500" />
          <span className="flex-1 bg-unit-green" />
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-ink dark:text-ink-dark">משימות המשרד</h1>
        <p className="mt-1.5 text-sm text-ink-soft dark:text-ink-dark-soft">התחברות עם השם המלא שלך</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {pendingAdmin ? (
          <>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                סיסמה עבור {pendingAdmin.name}
              </label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePassword()}
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-surface-dark-card py-3 pr-11 pl-4 text-ink dark:text-ink-dark focus:border-brand-500 outline-none transition-colors"
                />
              </div>
            </div>
            {error && (
              <p id="login-error" role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-400">
                {error}
              </p>
            )}
            <button
              onClick={handlePassword}
              disabled={!password || checking}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 font-bold text-white shadow-soft transition-all active:scale-[0.98] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed"
            >
              {checking ? "בודק..." : "כניסה"}
              <ArrowRight size={18} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={backToName}
              className="w-full text-center text-sm font-medium text-brand-700 underline dark:text-brand-300"
            >
              חזרה
            </button>
          </>
        ) : (
        <>
        <div>
          <label htmlFor="login-name" className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">שם מלא</label>
          <div className="relative">
            <User size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
            <input
              id="login-name"
              type="text"
              autoComplete="name"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="שם פרטי ושם משפחה"
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-surface-dark-card py-3 pr-11 pl-4 text-ink dark:text-ink-dark placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:border-brand-500 outline-none transition-colors"
            />
          </div>
        </div>

        <button
          type="button"
          role="checkbox"
          aria-checked={rememberMe}
          onClick={() => setRememberMe((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-surface-dark-card px-4 py-3 text-right"
        >
          <span
            className={
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors " +
              (rememberMe ? "bg-brand-600 border-brand-600" : "border-zinc-300 dark:border-zinc-600")
            }
          >
            {rememberMe && <Check size={13} className="text-white" strokeWidth={3} />}
          </span>
          <span className="text-sm font-medium text-ink dark:text-ink-dark">זכור אותי במכשיר הזה</span>
        </button>

        {error && (
          <p id="login-error" role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-400">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={!name.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 font-bold text-white shadow-soft transition-all active:scale-[0.98] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed"
        >
          כניסה
          <ArrowRight size={18} className="rotate-180" />
        </button>
        </>
        )}
        <p className="text-center text-sm">
          <Link href="/accessibility" className="font-medium text-brand-700 underline dark:text-brand-300">
            הצהרת נגישות
          </Link>
        </p>
      </motion.div>
    </main>
  );
}
