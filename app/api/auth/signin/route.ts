import { NextResponse } from "next/server";
import { serverClient, supabaseConfigured } from "@/lib/supabase";
import { loadOrCreate } from "@/lib/pipeline/turn";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Accounts aren't set up on this server yet." }, { status: 501 });
  const b = (await req.json().catch(() => ({}))) as { email?: string; password?: string; timeZone?: string; region?: string };
  const email = (b.email ?? "").trim().toLowerCase();
  const sb = await serverClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password: b.password ?? "" });
  if (error || !data.user) return NextResponse.json({ error: "Email or password didn't match." }, { status: 401 });
  const name = (typeof data.user.user_metadata?.name === "string" && data.user.user_metadata.name) || email.split("@")[0];
  const state = await loadOrCreate(data.user.id, name, b.timeZone, b.region);
  return NextResponse.json({ ok: true, name, userId: data.user.id, returning: state.history.length > 0 });
}
