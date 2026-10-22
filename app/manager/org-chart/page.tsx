"use client";

import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { useTaskStore } from "@/lib/store";
import AppHeader from "@/components/AppHeader";
import LoadingScreen from "@/components/LoadingScreen";
import OrgChartTree from "@/components/OrgChartTree";

function OrgChartInner() {
  useDocumentTitle("עץ מבנה ארגוני");
  const router = useRouter();
  const { team, orgUnits, loading, updateMember, addOrgUnit, addOrgDepartment } = useTaskStore();

  // Super-admin-only, full stop — unlike every other gated page in this app, no other role
  // (including a full manager/commander) is let in here. This is a private tool, not one shared
  // across managers, so it redirects everyone else straight back to their own home screen.
  useEffect(() => {
    if (loading) return;
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    const sessionMember = team.find((m) => m.id === s.userId);
    if (!sessionMember?.isSuperAdmin) {
      router.replace(sessionMember?.isManager ? "/manager" : `/staff?user=${s.userId}`);
    }
  }, [router, team, loading]);

  if (loading) return <LoadingScreen />;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-40 pt-[max(1.5rem,env(safe-area-inset-top))] md:my-8 md:max-w-3xl md:rounded-3xl md:bg-surface md:shadow-xl md:dark:bg-surface-dark">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        <AppHeader title="עץ מבנה ארגוני" subtitle="גררו חייל/ת למפקד/ת אחר/ת כדי לשנות שיוך, או הוסיפו יחידות/מדורים" />
        <Link
          href="/manager"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white dark:bg-surface-dark-card shadow-soft"
          aria-label="חזרה"
        >
          <ChevronRight size={18} className="text-ink-soft" />
        </Link>
      </header>

      <OrgChartTree
        team={team}
        orgUnits={orgUnits}
        currentUserId={getSession()?.userId}
        onReassignManager={(memberId, newManagerId) => updateMember(memberId, { managerId: newManagerId })}
        onCreateUnit={addOrgUnit}
        onCreateDepartment={addOrgDepartment}
        onUpdateMember={updateMember}
      />
    </main>
  );
}

export default function OrgChartPage() {
  return (
    <Suspense fallback={null}>
      <OrgChartInner />
    </Suspense>
  );
}
