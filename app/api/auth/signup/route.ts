import { NextResponse } from "next/server";
import { serverClient, supabaseConfigured } from "@/lib/supabase";
import { loadOrCreate } from "@/lib/pipeline/turn";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

/** Create an email + password account. Display name goes into user metadata. */
export async function POST(req: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: "Accounts aren't set up on this server yet." }, { status: 501 });
  const b = (await req.json().catch(() => ({}))) as { email?: string; password?: string; name?: string; timeZone?: string; region?: string; proactive?: boolean };
  const email = (b.email ?? "").trim().toLowerCase();
  const password = b.password ?? "";
  const name = (b.name ?? "").trim().slice(0, 40) || email.split("@")[0];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Use at least 8 characters for the password." }, { status: 400 });
  const sb = await serverClient();
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data.session) {
    // Email confirmation is on in the Supabase project: they must click the link first.
    return NextResponse.json({ ok: true, needsConfirmation: true });
  }
  const state = await loadOrCreate(data.user!.id, name, b.timeZone, b.region);
  if (typeof b.proactive === "boolean") { state.consent.enabled = b.proactive; await getStore().put(state); }
  return NextResponse.json({ ok: true, name, userId: data.user!.id, returning: false });
}
