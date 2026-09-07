"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTaskStore } from "@/lib/store";
import { getSession } from "@/lib/auth";
import LoadingScreen from "@/components/LoadingScreen";

export default function RootGateway() {
  const router = useRouter();
  const { team, loading } = useTaskStore();

  useEffect(() => {
    if (loading) return; // wait for team data before deciding
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const member = team.find((m) => m.id === session.userId);
    if (!member) {
      router.replace("/login");
      return;
    }
    // isSuperAdmin (e.g. Noam) gets full cross-department access without being a
    // "manager" in rank — she still lands on the command dashboard by default.
    router.replace(member.isManager || member.isSuperAdmin ? "/manager" : `/staff?user=${member.id}`);
  }, [router, team, loading]);

  return <LoadingScreen />;
}
