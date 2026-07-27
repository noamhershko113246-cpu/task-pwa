"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { useTaskStore } from "@/lib/store";
import { normalizePhone, setSession } from "@/lib/auth";
import LoadingScreen from "@/components/LoadingScreen";

export default function LoginPage() {
  const router = useRouter();
  const { team, loading } = useTaskStore();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  if (loading) return <LoadingScreen />;

  const handleSendCode = () => {
    setError("");
    const trimmed = phone.trim();

    // Special-case login (e.g. a name) for specific people instead of a phone number
    const byKeyword = team.find((m) => m.loginKeyword && m.loginKeyword === trimmed);
    if (byKeyword) {
      setMatchedUserId(byKeyword.id);
      setStep("code");
      return;
    }

    const normalized = normalizePhone(phone);
    const member = normalized ? team.find((m) => normalizePhone(m.phone) === normalized) : undefined;
    if (!member) {
      setError("לא זוהה משתמש תואם. פנה/י למפקד/ת כדי שתוסיף/תוסיף אותך.");
      return;
    }
    setMatchedUserId(member.id);
    setStep("code");
    // In production: trigger a real SMS via Supabase Auth (phone provider) or Twilio Verify here.
  };

  const handleVerifyCode = () => {
    setError("");
    if (code.trim().length < 4) {
      setError("קוד לא תקין — הזן/י את הקוד שקיבלת ב-SMS.");
      return;
    }
    if (!matchedUserId) return;

    setSession(matchedUserId, rememberMe);
    const member = team.find((m) => m.id === matchedUserId);
    router.push(member?.isManager ? "/manager" : `/staff?user=${matchedUserId}`);
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
        <p className="mt-1.5 text-sm text-ink-soft dark:text-ink-dark-soft">
          {step === "phone" ? "התחברות עם מספר הטלפון האישי" : "הזינו את הקוד שקיבלתם ב-SMS"}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === "phone" ? (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                מספר טלפון
              </label>
              <div className="relative">
                <Phone size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                  placeholder="05X-XXXXXXX"
                  className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-surface-dark-card py-3 pr-11 pl-4 text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 outline-none transition-colors"
                />
              </div>
            </div>

            {error && <p className="text-sm font-medium text-rose-500">{error}</p>}

            <button
              onClick={handleSendCode}
              disabled={!phone.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 font-bold text-white shadow-soft transition-all active:scale-[0.98] disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed"
            >
              שליחת קוד אימות
              <ArrowRight size={18} className="rotate-180" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink dark:text-ink-dark">
                קוד אימות
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                placeholder="1234"
                maxLength={6}
                className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-surface-dark-card px-4 py-3 text-center text-lg tracking-[0.5em] text-ink dark:text-ink-dark placeholder:text-zinc-400 focus:border-brand-500 outline-none transition-colors"
              />
              <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft dark:text-ink-dark-soft">
                <ShieldCheck size={12} />
                לצורך ההדגמה: כל קוד בן 4 ספרות יתקבל. בפרודקשן זה יתחבר לשליחת SMS אמיתית.
              </p>
            </div>

            <button
              type="button"
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
              <span className="text-sm font-medium text-ink dark:text-ink-dark">
                זכור אותי במכשיר הזה
              </span>
            </button>

            {error && <p className="text-sm font-medium text-rose-500">{error}</p>}

            <button
              onClick={handleVerifyCode}
              className="w-full rounded-2xl bg-brand-600 py-3.5 font-bold text-white shadow-soft transition-all active:scale-[0.98]"
            >
              אימות והתחברות
            </button>

            <button
              onClick={() => {
                setStep("phone");
                setCode("");
                setError("");
              }}
              className="w-full text-center text-sm font-medium text-ink-soft dark:text-ink-dark-soft"
            >
              החלפת מספר טלפון
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
