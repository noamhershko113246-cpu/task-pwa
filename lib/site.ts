/** Public origin used for canonical / Open Graph URLs. Override with NEXT_PUBLIC_SITE_URL (e.g. a custom domain). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://task-pwa-team.netlify.app").replace(/\/$/, "");

export const SITE_NAME = "משימות המשרד";
export const SITE_DESCRIPTION =
  "ניהול משימות יומי לצוות ולמשרד: הקצאת משימות, שלבים, תזכורות ולוח פיקוד למפקדים. אפליקציה להתקנה בטלפון.";
