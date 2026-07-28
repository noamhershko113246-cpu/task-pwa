"use client";

import React from "react";
import { ToastProvider } from "@/components/ToastProvider";
import { TaskStoreProvider } from "@/components/TaskStoreProvider"; 

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TaskStoreProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </TaskStoreProvider>
  );
}