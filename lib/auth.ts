/**
 * Who is signed in.
 *
 * With Supabase configured: email + password accounts (Supabase Auth), the
 * session lives in Supabase's own cookies, and userId is the auth user's id.
 *
 * Without it (local dev, or before keys are added): the original "log in with
 * anything" flow - an HMAC-signed cookie holding a hash of whatever they typed.
 */
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serverClient, supabaseConfigured } from "./supabase";

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
  if (supabaseConfigured()) {
    try {
      const sb = await serverClient();
      const { data } = await sb.auth.getUser();
      const u = data.user;
      if (!u) return null;
      const email = u.email ?? "";
      const name = (typeof u.user_metadata?.name === "string" && u.user_metadata.name.trim()) || email.split("@")[0] || "you";
      return { userId: u.id, name: name.slice(0, 40), identifier: email, createdAt: Date.parse(u.created_at) || Date.now() };
    } catch (err) {
      console.warn("[auth] supabase session check failed:", (err as Error).message);
      return null;
    }
  }
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
