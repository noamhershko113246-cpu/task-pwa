/**
 * Fades a screen in. Used by the per-section templates (app/manager/template.tsx, app/staff/template.tsx):
 * a template, unlike a layout, remounts on every navigation inside its section, which is what lets each
 * screen fade in as you move between them.
 *
 * Opacity only, on purpose: a transform on this wrapper would turn it into the containing block for
 * everything `position: fixed` inside (the "new task" button, the bottom bar, sheets) and make them jump
 * for the length of the animation. Done in CSS rather than framer-motion so the page is fully visible
 * even before any JavaScript has run, and the global reduced-motion rule covers it automatically.
 */
export default function RouteFade({ children }: { children: React.ReactNode }) {
  return <div className="animate-route-in">{children}</div>;
}
