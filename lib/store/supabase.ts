/**
 * Postgres-backed store (Supabase). One row per user with the whole state as
 * JSON - the state is read and written as a unit on every turn, so a document
 * shape is the honest fit. With DATA_ENCRYPTION_KEY set the JSON is sealed
 * before it is stored and the row holds {"enc": "..."} instead.
 *
 * Schema: supabase/schema.sql
 */
import { adminClient } from "../supabase";
import { open, seal, encryptionEnabled } from "./crypto";
import type { Store, StoredMessage, UserState } from "./types";

export class SupabaseStore implements Store {
  async get(userId: string): Promise<UserState | null> {
    const { data, error } = await adminClient().from("user_state").select("state").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(`supabase get: ${error.message}`);
    if (!data) return null;
    const s = data.state as { enc?: string } | UserState;
    if (s && typeof (s as { enc?: string }).enc === "string") return JSON.parse(open((s as { enc: string }).enc)) as UserState;
    return s as UserState;
  }

  async put(state: UserState): Promise<void> {
    const payload = encryptionEnabled() ? { enc: seal(JSON.stringify(state)) } : state;
    const { error } = await adminClient().from("user_state").upsert({
      user_id: state.userId, state: payload, updated_at: new Date().toISOString(),
      last_active_at: new Date(state.lastUserMessageAt || state.createdAt).toISOString(),
    });
    if (error) throw new Error(`supabase put: ${error.message}`);
  }

  async listActive(limit: number): Promise<string[]> {
    const { data, error } = await adminClient().from("user_state").select("user_id").order("last_active_at", { ascending: false }).limit(limit);
    if (error) throw new Error(`supabase listActive: ${error.message}`);
    return (data ?? []).map((r) => r.user_id as string);
  }

  async pushOutbox(userId: string, message: StoredMessage): Promise<void> {
    const payload = encryptionEnabled() ? { enc: seal(JSON.stringify(message)) } : message;
    const { error } = await adminClient().from("outbox").insert({ user_id: userId, message: payload });
    if (error) throw new Error(`supabase pushOutbox: ${error.message}`);
  }

  async drainOutbox(userId: string): Promise<StoredMessage[]> {
    const db = adminClient();
    const { data, error } = await db.from("outbox").select("id, message").eq("user_id", userId).order("id", { ascending: true });
    if (error) throw new Error(`supabase drainOutbox: ${error.message}`);
    if (!data?.length) return [];
    await db.from("outbox").delete().in("id", data.map((r) => r.id));
    return data.map((r) => { const m = r.message as { enc?: string } | StoredMessage; return typeof (m as { enc?: string }).enc === "string" ? (JSON.parse(open((m as { enc: string }).enc)) as StoredMessage) : (m as StoredMessage); });
  }
}
