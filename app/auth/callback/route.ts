import { NextResponse } from "next/server";
import { serverClient, supabaseConfigured } from "@/lib/supabase";

/** Email links (confirmation, password reset) land here with a code to exchange for a session. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/mood";
  if (code && supabaseConfigured()) {
    const sb = await serverClient();
    await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
