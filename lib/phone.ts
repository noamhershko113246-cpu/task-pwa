/** Normalizes a phone number for comparison — strips spaces, dashes, and a leading +972. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("972")) digits = "0" + digits.slice(3);
  return digits;
}

/** Converts a local Israeli number (05XXXXXXXX) to E.164 format (+9725XXXXXXXX) for Twilio. */
export function toE164(localPhone: string): string {
  const digits = normalizePhone(localPhone);
  return "+972" + digits.replace(/^0/, "");
}
