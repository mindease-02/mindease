import { NextResponse } from "next/server";
import { serverClient, supabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

/** Sends the password-reset email. Always answers ok, so it can't be used to probe for accounts. */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Accounts aren't set up on this server yet." }, { status: 501 });
  const b = (await req.json().catch(() => ({}))) as { email?: string };
  const email = (b.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Enter your email." }, { status: 400 });
  const origin = new URL(req.url).origin;
  const sb = await serverClient();
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset` });
  return NextResponse.json({ ok: true });
}
