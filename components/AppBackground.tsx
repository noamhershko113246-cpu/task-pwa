"use client";

import { TeamMember } from "@/lib/types";
import { resolveBackgroundLayer } from "@/lib/backgroundPresets";

/**
 * Full-screen custom background (uploaded photo or preset gradient), rendered
 * as its own `position: fixed` layer behind the page content instead of a
 * `background-attachment: fixed` on the scrolling container.
 *
 * Why: `background-attachment: fixed` is unreliable on iOS Safari (iPhone —
 * including 16 Pro Max — is WebKit-only, so this covers every iPhone) and on
 * many Android browsers: it's either silently ignored, or "cover" sizing gets
 * computed against the scrolling element's full content height instead of
 * the visible viewport, so a tall page makes the image zoom in far more than
 * intended and drift off-center. A `fixed inset-0` layer is sized against the
 * viewport itself (using `dvh`, which tracks the real visible height as the
 * browser chrome — address bar, home indicator — shows/hides), so the image
 * always fills and centers correctly no matter the device or scroll position.
 * `bg-cover bg-center` handles the crop-to-fill + centering on any aspect
 * ratio, so this looks right on every current phone size, not just specific
 * models.
 */
export default function AppBackground({ member }: { member: Pick<TeamMember, "backgroundUrl" | "backgroundPreset"> }) {
  const layer = resolveBackgroundLayer(member);
  if (!layer) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `linear-gradient(var(--bg-scrim), var(--bg-scrim)), ${layer}` }}
    />
  );
}
