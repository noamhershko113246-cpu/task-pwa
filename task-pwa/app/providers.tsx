"use client";

import React from "react";
import { ToastProvider } from "@/components/ToastProvider";
import { TaskStoreProvider } from "@/lib/store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <TaskStoreProvider>{children}</TaskStoreProvider>
    </ToastProvider>
  );
}