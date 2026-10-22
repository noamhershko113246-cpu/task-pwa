import type { Announcements, ScreenReaderInstructions } from "@dnd-kit/core";

/** Hebrew screen-reader text for dnd-kit (its defaults are English, which a Hebrew reader mispronounces). */
export const dndScreenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "כדי להרים פריט לחצו על רווח. אחרי ההרמה השתמשו במקשי החצים להזזה, ברווח להנחה, ובמקש Escape לביטול.",
};

export const dndAnnouncements: Announcements = {
  onDragStart: () => "הפריט הורם.",
  onDragOver: ({ over }) => (over ? "הפריט מעל אזור שאפשר להניח בו." : "הפריט מחוץ לאזור הנחה."),
  onDragEnd: ({ over }) => (over ? "הפריט הונח." : "הפריט הונח מחוץ לאזור הנחה, בלי שינוי."),
  onDragCancel: () => "הגרירה בוטלה. הפריט חזר למקומו.",
};
