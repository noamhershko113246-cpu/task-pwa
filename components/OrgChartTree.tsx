"use client";

import { dndAnnouncements, dndScreenReaderInstructions } from "@/lib/dndA11y";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { ChevronDown, Plus, UserX, Crown, GripVertical } from "lucide-react";
import clsx from "clsx";
import { DEFAULT_DEPARTMENT, TeamMember } from "@/lib/types";
import { OrgUnit, getDepartmentsForUnit } from "@/lib/orgStructure";
import { buildDeptForest, dropIneligibilityReason, OrgTreeNode } from "@/lib/buildOrgTree";
import { useToast } from "./ToastProvider";
import Avatar from "./Avatar";

// Id of whoever is looking at the chart, so their own card can be marked and scrolled into view —
// in a long multi-unit tree it's otherwise easy to miss where you ended up.
const CurrentUserContext = createContext<string | null>(null);

function PersonNode({
  node,
  team,
  activeMember,
  onUpdateMember,
}: {
  node: OrgTreeNode;
  team: TeamMember[];
  activeMember: TeamMember | null;
  onUpdateMember: (id: string, patch: { title?: string | null; isManager?: boolean }) => void;
}) {
  const { member, children, orphaned } = node;
  const isDragged = activeMember?.id === member.id;
  const dragDisabled = Boolean(member.isSuperManager); // no valid manager within her own department
  const isValidDropTarget = Boolean(
    activeMember && dropIneligibilityReason(activeMember, member, team) === null
  );
  const isCommander = Boolean(member.isManager || member.isSuperManager);
  const isMe = useContext(CurrentUserContext) === member.id;

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(member.title ?? "");
  const [commanderDraft, setCommanderDraft] = useState(isCommander);

  const draggable = useDraggable({ id: member.id, disabled: dragDisabled });
  // Deliberately NOT disabled for ineligible targets while a drag is active: dnd-kit only
  // resolves `over` for droppables it considers, so a disabled one never registers a drop at
  // all — onDragEnd's `!over` bail then silently no-ops with zero feedback. Keeping every
  // person droppable during a drag (dimmed via isValidDropTarget below, not truly disabled)
  // lets onDragEnd actually see what was dropped where and explain why it didn't work.
  const droppable = useDroppable({ id: member.id, disabled: !activeMember });
  const setNodeRef = (el: HTMLElement | null) => {
    draggable.setNodeRef(el);
    droppable.setNodeRef(el);
  };

  const startEdit = () => {
    if (draggable.isDragging) return;
    setTitleDraft(member.title ?? "");
    setCommanderDraft(isCommander);
    setEditing(true);
  };

  const save = () => {
    const patch: { title?: string | null; isManager?: boolean } = { title: titleDraft.trim() || null };
    if (!member.isSuperManager) patch.isManager = commanderDraft;
    onUpdateMember(member.id, patch);
    setEditing(false);
  };

  return (
    <div>
      <div
        ref={setNodeRef}
        id={isMe ? "org-chart-me" : undefined}
        {...(dragDisabled ? {} : draggable.listeners)}
        {...(dragDisabled ? {} : draggable.attributes)}
        onKeyDown={(e) => {
          if (dragDisabled) return;
          draggable.listeners?.onKeyDown?.(e);
          if (e.key === "Enter" && e.target === e.currentTarget && !draggable.isDragging) startEdit();
        }}
        onClick={startEdit}
        style={
          draggable.transform
            ? { transform: `translate(${draggable.transform.x}px, ${draggable.transform.y}px)`, zIndex: 50 }
            : undefined
        }
        className={clsx(
          "mb-2 flex select-none items-center gap-2 rounded-2xl border p-2.5 transition-colors",
          isMe && "ring-2 ring-brand-400",
          !dragDisabled && "cursor-grab active:cursor-grabbing",
          draggable.isDragging && "opacity-40",
          droppable.isOver && isValidDropTarget && "border-brand-400 bg-brand-50/60 dark:bg-brand-500/10",
          !droppable.isOver && isValidDropTarget && "border-brand-200/70 dark:border-brand-500/30",
          !activeMember && "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card",
          activeMember && !isValidDropTarget && !isDragged && "border-zinc-100 dark:border-zinc-800 bg-white/50 opacity-40 dark:bg-surface-dark-card/50"
        )}
      >
        <Avatar member={member} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink dark:text-ink-dark">
            <span className="truncate">{member.name}</span>
            {isMe && (
              <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                אתה
              </span>
            )}
          </p>
          {member.title && (
            <p className="truncate text-xs text-ink-soft dark:text-ink-dark-soft">{member.title}</p>
          )}
        </div>
        {isCommander && (
          <Crown size={14} className="shrink-0 text-amber-500" aria-label="מפקד/ת" />
        )}
        {orphaned && (
          <span
            title='ה-managerId שלו/ה מצביע על מישהו מחוץ למדור הזה'
            className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          >
            <UserX size={11} />
            ללא שיוך
          </span>
        )}
        {/* The row itself is no longer `touch-none` — that made every row a dead zone for scrolling
            on a phone (you couldn't swipe the page with a finger on a person). A mouse still drags
            from anywhere on the row; on touch, press-and-hold the row or grab this grip, which is
            the only part that blocks scrolling. */}
        {!dragDisabled && (
          <span
            ref={draggable.setActivatorNodeRef}
            {...draggable.listeners}
            onClick={(e) => e.stopPropagation()}
            aria-hidden="true"
            className="flex h-9 w-8 shrink-0 touch-none items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400"
          >
            <GripVertical size={16} />
          </span>
        )}
      </div>

      {editing && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 space-y-2 rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/60 dark:bg-brand-500/10 p-2.5"
        >
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="תפקיד (למשל: ק. כא סדיר)"
                aria-label="תפקיד (למשל: ק. כא סדיר)"
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-ink dark:text-ink-dark outline-none"
          />
          {!member.isSuperManager && (
            <label className="flex min-h-11 items-center gap-2 px-1 text-xs font-medium text-ink-soft dark:text-ink-dark-soft">
              <input
                type="checkbox"
                checked={commanderDraft}
                onChange={(e) => setCommanderDraft(e.target.checked)}
                className="h-5 w-5 shrink-0 rounded accent-brand-600"
              />
              מפקד/ת — יכול/ה להיות מפקד/ת של אנשים או מפקדים אחרים
            </label>
          )}
          <div className="flex gap-2">
            <button onClick={save} className="min-h-11 flex-1 rounded-xl bg-brand-600 py-2 text-sm font-bold text-white">
              שמירה
            </button>
            <button
              onClick={() => setEditing(false)}
              className="min-h-11 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2 text-sm font-bold text-ink-soft dark:text-ink-dark-soft"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Connector: a continuous line threading through this person's reports, so hierarchy
          reads unambiguously even when several people share similar names/positions — relying
          on indentation-only depth was too subtle to tell "reports to" apart at a glance. */}
      {children.length > 0 && (
        <div className="mb-1 me-2.5 border-e-2 border-zinc-200 dark:border-zinc-700 pe-2">
          {children.map((child) => (
            <PersonNode key={child.member.id} node={child} team={team} activeMember={activeMember} onUpdateMember={onUpdateMember} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddDepartmentCard({ unitKey, onAdd }: { unitKey: string; onAdd: (unitKey: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 py-2.5 text-xs font-bold text-ink-soft dark:text-ink-dark-soft transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <Plus size={14} />
        הוספת מדור
      </button>
    );
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(unitKey, trimmed);
    setName("");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-dashed border-brand-300 dark:border-brand-500/40 p-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="שם המדור החדש"
                aria-label="שם המדור החדש"
        className="min-w-0 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-ink dark:text-ink-dark outline-none"
      />
      <button onClick={submit} className="shrink-0 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white">
        הוספה
      </button>
      <button
        onClick={() => setOpen(false)}
        className="shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-bold text-ink-soft dark:text-ink-dark-soft"
      >
        ביטול
      </button>
    </div>
  );
}

function AddUnitCard({ onAdd }: { onAdd: (key: string, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700 py-3.5 text-sm font-bold text-ink-soft dark:text-ink-dark-soft transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <Plus size={16} />
        הוספת יחידה חדשה
      </button>
    );
  }

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, trimmed);
    setName("");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 rounded-3xl border border-dashed border-brand-300 dark:border-brand-500/40 bg-brand-50/40 dark:bg-brand-500/5 p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="שם היחידה החדשה"
                aria-label="שם היחידה החדשה"
        className="min-w-0 flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-ink dark:text-ink-dark outline-none"
      />
      <button onClick={submit} className="shrink-0 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white">
        הוספה
      </button>
      <button
        onClick={() => setOpen(false)}
        className="shrink-0 rounded-2xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-bold text-ink-soft dark:text-ink-dark-soft"
      >
        ביטול
      </button>
    </div>
  );
}

function DepartmentSection({
  unit,
  department,
  members,
  team,
  activeMember,
  onUpdateMember,
}: {
  unit: string;
  department: string;
  members: TeamMember[];
  team: TeamMember[];
  activeMember: TeamMember | null;
  onUpdateMember: (id: string, patch: { title?: string | null; isManager?: boolean }) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const forest = buildDeptForest(members);

  return (
    <div className="mb-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/30 p-3">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mb-2 flex w-full items-center justify-between text-xs font-bold text-ink-soft dark:text-ink-dark-soft"
      >
        <span>
          {department} ({members.length})
        </span>
        <ChevronDown size={14} className={clsx("transition-transform", collapsed && "-rotate-90")} />
      </button>
      {!collapsed && (
        <div>
          {forest.length === 0 ? (
            <p className="py-2 text-center text-xs text-ink-soft dark:text-ink-dark-soft">אין עדיין אנשים במדור הזה</p>
          ) : (
            forest.map((node) => (
              <PersonNode key={node.member.id} node={node} team={team} activeMember={activeMember} onUpdateMember={onUpdateMember} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function OrgChartTree({
  team,
  orgUnits,
  onReassignManager,
  onCreateUnit,
  onCreateDepartment,
  onUpdateMember,
  currentUserId,
}: {
  team: TeamMember[];
  orgUnits: OrgUnit[];
  currentUserId?: string;
  onReassignManager: (memberId: string, newManagerId: string) => void;
  onCreateUnit: (key: string, label: string) => void;
  onCreateDepartment: (unitKey: string, name: string) => void;
  onUpdateMember: (id: string, patch: { title?: string | null; isManager?: boolean }) => void;
}) {
  const { showToast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrolledToMe = useRef(false);
  useEffect(() => {
    if (scrolledToMe.current || !currentUserId) return;
    const el = document.getElementById("org-chart-me");
    if (!el) return;
    scrolledToMe.current = true;
    el.scrollIntoView({ block: "center" });
  }, [currentUserId, team, orgUnits]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    // Keyboard: Space picks a card/person up, arrows move it, Space drops, Esc cancels.
    // Enter is left free to open the item (see onKeyDown on the draggable).
    useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] } })
  );

  const activeMember = activeId ? team.find((m) => m.id === activeId) ?? null : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const dragged = team.find((m) => m.id === active.id);
    const target = team.find((m) => m.id === over.id);
    if (!dragged || !target || dragged.id === target.id) return;

    const reason = dropIneligibilityReason(dragged, target, team);
    if (reason) {
      const messages: Record<typeof reason, string> = {
        "different-group": "אפשר להעביר רק בתוך אותו מדור ואותה יחידה",
        "not-commander": `${target.name} לא מוגדר/ת כמפקד/ת — קודם צריך לסמן אותו/ה ככזה/י (לחיצה על הכרטיס שלו/ה)`,
        "would-create-cycle": `אי אפשר — ${target.name} כבר תחת ${dragged.name} בשרשרת הפיקוד, וזה ייצור מעגל`,
      };
      showToast(messages[reason], "error");
      return;
    }
    if (dragged.managerId === target.id) return;
    onReassignManager(dragged.id, target.id);
  };

  return (
    <CurrentUserContext.Provider value={currentUserId ?? null}>
    <DndContext
      sensors={sensors}
      accessibility={{ announcements: dndAnnouncements, screenReaderInstructions: dndScreenReaderInstructions }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        {orgUnits.map((unit) => {
          const departments = getDepartmentsForUnit(orgUnits, unit.key);
          return (
            <section key={unit.key} className="mb-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-surface-dark-card p-4 shadow-card">
              <p className="mb-3 text-sm font-bold text-ink dark:text-ink-dark">{unit.label}</p>
              {departments.map((dept) => (
                <DepartmentSection
                  key={`${unit.key}::${dept}`}
                  unit={unit.key}
                  department={dept}
                  members={team.filter(
                    (m) => m.brigade === unit.key && (m.department ?? DEFAULT_DEPARTMENT) === dept
                  )}
                  team={team}
                  activeMember={activeMember}
                  onUpdateMember={onUpdateMember}
                />
              ))}
              <AddDepartmentCard unitKey={unit.key} onAdd={onCreateDepartment} />
            </section>
          );
        })}
        <AddUnitCard onAdd={onCreateUnit} />
      </div>
      <DragOverlay>
        {activeMember && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-brand-300 bg-white dark:bg-surface-dark-card p-2.5 shadow-lg">
            <Avatar member={activeMember} size="sm" />
            <p className="text-sm font-bold text-ink dark:text-ink-dark">{activeMember.name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
    </CurrentUserContext.Provider>
  );
}
