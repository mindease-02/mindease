/**
 * "Log in with anything." A name is enough. There is no password and nothing to
 * recover, because the identity here is only a key for the person's own state.
 *
 * The cookie is an HMAC-signed JSON blob so it cannot be forged to read someone
 * else's history. userId is a hash of the identifier so the raw name/email is
 * not the storage key.
 */
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "me_session";
const MAX_AGE = 60 * 60 * 24 * 90;

export interface Session {
  userId: string;
  name: string;
  identifier: string;
  createdAt: number;
}

function secret(): string {
  return process.env.SESSION_SECRET || "dev-secret-change-me-" + (process.env.VERCEL_URL ?? "local");
}

export function userIdFor(identifier: string): string {
  return createHash("sha256").update(identifier.trim().toLowerCase()).digest("hex").slice(0, 24);
}

export function signSession(s: Session): string {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
  } catch {
    return null;
  }
}

export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  };
}
