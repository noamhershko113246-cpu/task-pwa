/**
 * One set of motion values for the whole app, so animations feel like they belong together.
 * Short on purpose: this is a tool people open many times a day, and (per Apple's HIG) motion should
 * be brief and precise rather than prominent. Small things (a row leaving, a dialog appearing) use
 * `base`; larger or more deliberate ones use `slow`; `fast` is for tiny feedback.
 */
export const DURATION = { fast: 0.15, base: 0.2, slow: 0.3 } as const;

/** Material's "standard" curve: starts quickly, lands softly. */
export const EASE = [0.2, 0, 0, 1] as const;

/** The spring every bottom sheet already used — kept in one place. */
export const SHEET_SPRING = { type: "spring", damping: 32, stiffness: 320 } as const;
