export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme-preference";

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Applies the given preference to <html class="dark"> right now. */
export function applyTheme(pref: ThemePreference) {
  if (typeof document === "undefined") return;
  const shouldBeDark = pref === "dark" || (pref === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", shouldBeDark);
}

/** Persists the choice (this device only — same pattern as any local UI preference) and applies it immediately. */
export function setTheme(pref: ThemePreference) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
}

/**
 * Inline script source, meant to run in <head> before first paint, so the
 * page never flashes the wrong theme. Reads the exact same localStorage key
 * as getStoredTheme()/setTheme() above — keep both in sync if this changes.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var pref = localStorage.getItem("${STORAGE_KEY}");
    var dark = pref === "dark" || (pref !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;
