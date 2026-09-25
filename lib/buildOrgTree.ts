import { DEFAULT_DEPARTMENT, TeamMember } from "./types";

export interface OrgTreeNode {
  member: TeamMember;
  children: OrgTreeNode[];
  /** managerId points outside this (brigade, department) pair — not supposed to happen (the
   *  edit form only ever offers same-instance managers), but the DB doesn't enforce it, so this
   *  renders the person as a visible root with a marker instead of silently dropping them. */
  orphaned: boolean;
}

/**
 * Builds a forest from one department instance's flat member list (everyone already filtered to
 * the same (brigade, department) pair), using managerId edges.
 *
 * Root = the commander (isSuperManager), if present. Anyone with no managerId attaches directly
 * under the commander when one exists (matches getVisibleScope's existing "unset managerId =
 * visible to every manager" semantics — lib/types.ts), or becomes their own root otherwise.
 * Everyone else nests under whoever their managerId points to.
 */
export function buildDeptForest(members: TeamMember[]): OrgTreeNode[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const commander = members.find((m) => m.isSuperManager);
  const childrenOf = new Map<string, TeamMember[]>();
  const rootless: TeamMember[] = [];
  const orphaned: TeamMember[] = [];

  for (const m of members) {
    if (commander && m.id === commander.id) continue;
    if (m.managerId) {
      if (byId.has(m.managerId)) {
        const list = childrenOf.get(m.managerId) ?? [];
        list.push(m);
        childrenOf.set(m.managerId, list);
      } else {
        orphaned.push(m);
      }
    } else if (commander) {
      const list = childrenOf.get(commander.id) ?? [];
      list.push(m);
      childrenOf.set(commander.id, list);
    } else {
      rootless.push(m);
    }
  }

  function buildNode(m: TeamMember, isOrphaned: boolean): OrgTreeNode {
    return {
      member: m,
      orphaned: isOrphaned,
      children: (childrenOf.get(m.id) ?? []).map((c) => buildNode(c, false)),
    };
  }

  const roots: OrgTreeNode[] = [];
  if (commander) roots.push(buildNode(commander, false));
  roots.push(...rootless.map((m) => buildNode(m, false)));
  roots.push(...orphaned.map((m) => buildNode(m, true)));
  return roots;
}

/** Walks `startId`'s managerId chain upward; true if `ancestorId` appears anywhere in it.
 *  Used to block drops that would create a cycle — see dropIneligibilityReason below. Guards
 *  against an already-corrupt chain looping forever by bailing once an id repeats. */
function hasAncestor(startId: string, ancestorId: string, byId: Map<string, TeamMember>): boolean {
  const seen = new Set<string>();
  let current = byId.get(startId);
  while (current?.managerId) {
    if (current.managerId === ancestorId) return true;
    if (seen.has(current.managerId)) return false;
    seen.add(current.managerId);
    current = byId.get(current.managerId);
  }
  return false;
}

export type DropIneligibilityReason = "different-group" | "not-commander" | "would-create-cycle";

/**
 * Why `dragged` may NOT be dropped onto `target` in the org-chart tree to become their report —
 * or null if the drop is allowed. Checked in this order:
 *  - same (brigade, department) pair only ("different-group") — a cross-department drop would
 *    silently change the dragged person's isolation scope, which stays an explicit action in the
 *    edit form, not a drag gesture.
 *  - target must be a commander ("not-commander") — anyone flagged isManager or isSuperManager
 *    may have reports, including other commanders (a commander under a commander is a valid
 *    chain here; this is deliberately not a fixed-depth rank ladder). Toggling who counts as a
 *    commander is done from the tree itself (see OrgChartTree's per-person commander toggle).
 *  - the drop must not create a cycle ("would-create-cycle") — since any commander can now be
 *    placed under any other commander, dropping `dragged` onto one of `dragged`'s own reports
 *    (direct or indirect) would make them each other's manager. buildDeptForest can only reach
 *    people reachable from the department's root, so anyone caught in such a cycle would simply
 *    vanish from the tree with no error — this blocks it before it can happen.
 */
export function dropIneligibilityReason(
  dragged: TeamMember,
  target: TeamMember,
  team: TeamMember[]
): DropIneligibilityReason | null {
  if (dragged.id === target.id) return "different-group"; // never offered as a target; treated like any other mismatch
  if (target.brigade !== dragged.brigade) return "different-group";
  if ((target.department ?? DEFAULT_DEPARTMENT) !== (dragged.department ?? DEFAULT_DEPARTMENT)) return "different-group";
  if (!(target.isManager || target.isSuperManager)) return "not-commander";
  const byId = new Map(team.map((m) => [m.id, m]));
  if (hasAncestor(target.id, dragged.id, byId)) return "would-create-cycle";
  return null;
}

export function isEligibleDropTarget(dragged: TeamMember, target: TeamMember, team: TeamMember[]): boolean {
  return dropIneligibilityReason(dragged, target, team) === null;
}
