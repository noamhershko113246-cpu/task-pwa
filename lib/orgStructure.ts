/**
 * The real organizational chart this app's hierarchy is modeled on — fixed, hard-coded
 * constants rather than free text, so "which unit / which department" is always picked from a
 * closed list instead of typed by hand (the exact source of the "משאן" vs 'משא"ן' mismatch this
 * replaces). A "unit" here is either the division HQ (מפא"ג) or one of its 5 brigades; each unit
 * has its own fixed list of departments. Department names repeat across units on purpose — "משא"ן
 * of חטיבה 14" and "משא"ן of מפא"ג" are two entirely separate, isolated department instances that
 * happen to share a name, not the same department.
 */

export const HQ_UNIT = 'מפא"ג';

const COMMON_DEPARTMENTS = ['אג"ם', "מודיעין", 'משא"ן', "לוגיסטיקה", 'טנ"א', "תקשוב"] as const;

export interface OrgUnit {
  key: string;
  label: string; // e.g. "חטיבה 14 — המחץ" — display only, key is what's stored
  departments: readonly string[];
}

export const ORG_UNITS: OrgUnit[] = [
  { key: HQ_UNIT, label: 'מפא"ג — מפקדת האוגדה', departments: [...COMMON_DEPARTMENTS, "רפואה"] },
  { key: "חטיבה 10", label: "חטיבה 10 — הראל", departments: COMMON_DEPARTMENTS },
  { key: "חטיבה 12", label: "חטיבה 12 — הנגב", departments: COMMON_DEPARTMENTS },
  { key: "חטיבה 14", label: "חטיבה 14 — המחץ", departments: COMMON_DEPARTMENTS },
  { key: "חטיבה 16", label: "חטיבה 16 — ירושלים", departments: COMMON_DEPARTMENTS },
  { key: "חטיבה 454", label: "חטיבה 454 — עוצבת התבור", departments: COMMON_DEPARTMENTS },
];

export function getUnit(unitKey: string): OrgUnit | undefined {
  return ORG_UNITS.find((u) => u.key === unitKey);
}

export function getDepartmentsForUnit(unitKey: string): readonly string[] {
  return getUnit(unitKey)?.departments ?? [];
}

/** Every department name that exists anywhere, deduped — e.g. for a fallback/legacy display. */
export const ALL_DEPARTMENT_NAMES = Array.from(new Set(ORG_UNITS.flatMap((u) => u.departments)));

/**
 * Rank *within one department instance* — a closed 3-tier ladder, not an open-ended chain.
 * Confirmed against every real example in this org: a department has exactly one commander
 * (isSuperManager) at the top, any number of officers (isManager) reporting to her in parallel
 * (e.g. תאיר and ליאם both report directly to רעות), and any number of regular members
 * reporting to a specific officer or with no explicit manager at all (falls back to "visible to
 * the department's own officers/commander").
 */
export type DepartmentRank = "member" | "officer" | "commander";

export function rankFromFlags(isManager?: boolean, isSuperManager?: boolean): DepartmentRank {
  if (isSuperManager) return "commander";
  if (isManager) return "officer";
  return "member";
}

export function flagsFromRank(rank: DepartmentRank): { isManager: boolean; isSuperManager: boolean } {
  return { isManager: rank !== "member", isSuperManager: rank === "commander" };
}

// Matches the wording RoleBadge.tsx already shows elsewhere in the app for these same two
// flags (isManager → "מפקד/ת", isSuperManager → "מפקד/ת מחלקה") — kept identical on purpose so
// this select and the roster's badges never disagree about what to call the same person's
// rank. Deliberately generic, not a specific role name: a department's real commander title
// (e.g. "קמשא" for משא"ן, "קטא" for טנ"א) is per-person data that belongs in their own `title`
// field, not a rank label — the same generic word has to fit every department.
export const RANK_LABELS: Record<DepartmentRank, string> = {
  member: "חייל/ת",
  officer: "מפקד/ת",
  commander: "מפקד/ת מחלקה",
};
