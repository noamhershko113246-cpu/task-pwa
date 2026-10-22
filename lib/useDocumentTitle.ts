"use client";

import { useEffect } from "react";

const APP_NAME = "משימות המשרד";

/**
 * Gives each client-rendered page its own <title> so screen-reader users hear where they are.
 * Runs after every render (not just when `title` changes) because a client-side redirect makes
 * Next reset the title to the layout default.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const full = `${title} | ${APP_NAME}`;
    if (document.title !== full) document.title = full;
  });
}
