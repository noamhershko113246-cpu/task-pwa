import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

// Extra password for the super-admin account. Only a salted SHA-256 hash is kept here, and this
// file runs on the server only — the password itself never reaches the browser bundle.
const ADMIN_PASSWORD_HASH = "0c8ecc45abd7d855bfed79ceb7901002ec00d7745847458aa718e638341a25af";
const SALT = "taskpwa-admin:";

// Best-effort brute-force brake (in-memory, so per server instance): 5 misses locks that IP for a minute.
const MAX_MISSES = 5;
const LOCK_MS = 60_000;
const misses = new Map<string, { count: number; lockedUntil: number }>();

function clientKey(req: NextRequest) {
  return req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function POST(req: NextRequest) {
  const key = clientKey(req);
  const now = Date.now();
  const entry = misses.get(key);
  if (entry && entry.lockedUntil > now) {
    return NextResponse.json({ ok: false, error: "locked" }, { status: 429 });
  }

  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const given = createHash("sha256").update(SALT + password).digest();
  const expected = Buffer.from(ADMIN_PASSWORD_HASH, "hex");
  const ok = given.length === expected.length && timingSafeEqual(given, expected);

  if (ok) {
    misses.delete(key);
    return NextResponse.json({ ok: true });
  }

  const count = (entry?.count ?? 0) + 1;
  misses.set(key, count >= MAX_MISSES ? { count: 0, lockedUntil: now + LOCK_MS } : { count, lockedUntil: 0 });
  return NextResponse.json({ ok: false }, { status: 401 });
}
