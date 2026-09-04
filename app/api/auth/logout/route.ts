import { NextResponse } from "next/server";
import { serverClient, supabaseConfigured } from "@/lib/supabase";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  if (supabaseConfigured()) { try { const sb = await serverClient(); await sb.auth.signOut(); } catch { /* already out */ } }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
