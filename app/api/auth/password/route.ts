import { NextResponse } from "next/server";
import { serverClient, supabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

/** Set a new password for the signed-in user (after the reset link, or from settings). */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Accounts aren't set up on this server yet." }, { status: 501 });
  const b = (await req.json().catch(() => ({}))) as { password?: string };
  if (!b.password || b.password.length < 8) return NextResponse.json({ error: "Use at least 8 characters." }, { status: 400 });
  const sb = await serverClient();
  const { error } = await sb.auth.updateUser({ password: b.password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
