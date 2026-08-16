import { TeamMember } from "./types";

export interface BackgroundPreset {
  key: string;
  label: string;
  css: string; // any valid CSS background-image value (gradient, etc.)
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { key: "sunset", label: "שקיעה", css: "linear-gradient(135deg, #f97316, #ec4899)" },
  { key: "ocean", label: "אוקיינוס", css: "linear-gradient(135deg, #0ea5e9, #6366f1)" },
  { key: "forest", label: "יער", css: "linear-gradient(135deg, #22c55e, #0d9488)" },
  { key: "candy", label: "קנדי", css: "linear-gradient(135deg, #f472b6, #a855f7)" },
  { key: "sand", label: "חול", css: "linear-gradient(135deg, #fbbf24, #f59e0b)" },
  { key: "mono", label: "אפור", css: "linear-gradient(135deg, #94a3b8, #475569)" },
];

export function presetByKey(key: string | null | undefined): BackgroundPreset | undefined {
  if (!key) return undefined;
  return BACKGROUND_PRESETS.find((p) => p.key === key);
}

/**
 * Resolves whatever this member has chosen for a background — an uploaded
 * image takes priority (should never both be set, but if it happens the
 * photo wins), then a preset gradient, else nothing (default app background).
 * Returns a value usable directly as a CSS background-image layer.
 */
export function resolveBackgroundLayer(member: Pick<TeamMember, "backgroundUrl" | "backgroundPreset">): string | null {
  if (member.backgroundUrl) return `url(${member.backgroundUrl})`;
  const preset = presetByKey(member.backgroundPreset);
  if (preset) return preset.css;
  return null;
}
