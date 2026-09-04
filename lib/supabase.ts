/**
 * Supabase wiring. Two clients:
 *  - serverClient(): cookie-bound, for auth (who is signed in). Uses the public
 *    anon key; RLS applies.
 *  - adminClient(): service role, for the state store. Server-only; never sent
 *    to the browser. RLS is bypassed, which is fine because every access goes
 *    through our own session check first.
 *
 * With no keys configured the app falls back to the name-only cookie login and
 * the Upstash / in-memory store, so local dev keeps working.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const supabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const supabaseStoreConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function serverClient() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* read-only context (server component) */ } },
    },
  });
}

let admin: SupabaseClient | null = null;
export function adminClient(): SupabaseClient {
  if (!admin) admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
