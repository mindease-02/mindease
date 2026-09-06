/**
 * Companion persistence: profile, memories, transcript.
 *
 * Supabase when the service role is configured (three tables, see
 * supabase/migrations/20260906000000_companion.sql, RLS on), an in-memory map
 * otherwise so local dev works with zero setup. Every query is scoped by
 * user_id on the server *and* by RLS in the database, so a bug in one layer
 * still cannot leak another person's companion.
 */
import { adminClient, supabaseStoreConfigured } from "../supabase";
import { newId, newProfile, sanitizeSettings } from "./profile";
import type { CompanionMemory, CompanionMessage, CompanionProfile, CompanionSettings } from "./types";

export interface CompanionStore {
  getProfile(userId: string): Promise<CompanionProfile | null>;
  saveProfile(userId: string, settings: CompanionSettings): Promise<CompanionProfile>;
  deleteProfile(userId: string): Promise<void>;

  listMemories(userId: string, companionId: string): Promise<CompanionMemory[]>;
  addMemories(userId: string, companionId: string, items: { memory: string; kind: string; importance: number }[]): Promise<CompanionMemory[]>;
  deleteMemory(userId: string, id: string): Promise<boolean>;
  clearMemories(userId: string, companionId: string): Promise<number>;

  listMessages(userId: string, companionId: string, limit: number): Promise<CompanionMessage[]>;
  addMessages(userId: string, companionId: string, items: Omit<CompanionMessage, "userId" | "companionId">[]): Promise<void>;
  clearMessages(userId: string, companionId: string): Promise<number>;
}

const MESSAGE_CAP = 400;

class MemoryCompanionStore implements CompanionStore {
  profiles = new Map<string, CompanionProfile>();
  memories = new Map<string, CompanionMemory[]>();
  messages = new Map<string, CompanionMessage[]>();

  async getProfile(userId: string) { return this.profiles.get(userId) ?? null; }
  async saveProfile(userId: string, settings: CompanionSettings) {
    const prev = this.profiles.get(userId);
    const now = Date.now();
    const p: CompanionProfile = prev ? { ...prev, ...settings, updatedAt: now } : newProfile(userId, settings, now);
    this.profiles.set(userId, p);
    return p;
  }
  async deleteProfile(userId: string) { this.profiles.delete(userId); this.memories.delete(userId); this.messages.delete(userId); }

  async listMemories(userId: string, companionId: string) { return (this.memories.get(userId) ?? []).filter((m) => m.companionId === companionId).sort((a, b) => b.createdAt - a.createdAt); }
  async addMemories(userId: string, companionId: string, items: { memory: string; kind: string; importance: number }[]) {
    const now = Date.now();
    const list = this.memories.get(userId) ?? [];
    const added: CompanionMemory[] = [];
    for (const it of items) {
      if (list.some((m) => m.companionId === companionId && similar(m.memory, it.memory))) continue;
      const m: CompanionMemory = { id: newId(), userId, companionId, memory: it.memory, kind: it.kind, importance: it.importance, createdAt: now, updatedAt: now };
      list.push(m); added.push(m);
    }
    this.memories.set(userId, list);
    return added;
  }
  async deleteMemory(userId: string, id: string) {
    const list = this.memories.get(userId) ?? [];
    const next = list.filter((m) => m.id !== id);
    this.memories.set(userId, next);
    return next.length !== list.length;
  }
  async clearMemories(userId: string, companionId: string) {
    const list = this.memories.get(userId) ?? [];
    const next = list.filter((m) => m.companionId !== companionId);
    this.memories.set(userId, next);
    return list.length - next.length;
  }

  async listMessages(userId: string, companionId: string, limit: number) {
    return (this.messages.get(userId) ?? []).filter((m) => m.companionId === companionId).slice(-limit);
  }
  async addMessages(userId: string, companionId: string, items: Omit<CompanionMessage, "userId" | "companionId">[]) {
    const list = this.messages.get(userId) ?? [];
    for (const it of items) list.push({ ...it, id: it.id ?? newId(), userId, companionId });
    this.messages.set(userId, list.slice(-MESSAGE_CAP));
  }
  async clearMessages(userId: string, companionId: string) {
    const list = this.messages.get(userId) ?? [];
    const next = list.filter((m) => m.companionId !== companionId);
    this.messages.set(userId, next);
    return list.length - next.length;
  }
}

type Row = Record<string, unknown>;

class SupabaseCompanionStore implements CompanionStore {
  private rowToProfile(r: Row): CompanionProfile {
    // personality_config holds the settings object minus name, avatar, voice and
    // conversation, which live in their own columns.
    const pc = (r.personality_config ?? {}) as Partial<CompanionSettings>;
    const merged = sanitizeSettings({ ...pc, name: r.name, appearance: { ...(pc.appearance ?? {}), avatarId: r.avatar_id }, voice: r.voice_config ?? pc.voice, conversation: r.conversation_config ?? pc.conversation });
    return { id: String(r.id), userId: String(r.user_id), ...merged, createdAt: Date.parse(String(r.created_at)), updatedAt: Date.parse(String(r.updated_at)) };
  }

  async getProfile(userId: string) {
    const { data, error } = await adminClient().from("companions").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(`companions get: ${error.message}`);
    return data ? this.rowToProfile(data as Row) : null;
  }
  async saveProfile(userId: string, settings: CompanionSettings) {
    const { voice, conversation, ...rest } = settings;
    const now = new Date().toISOString();
    const existing = await this.getProfile(userId);
    const row = {
      id: existing?.id ?? newId(), user_id: userId, name: settings.name, avatar_id: settings.appearance.avatarId,
      personality_config: rest, voice_config: voice, conversation_config: conversation, updated_at: now,
      ...(existing ? {} : { created_at: now }),
    };
    const { data, error } = await adminClient().from("companions").upsert(row, { onConflict: "user_id" }).select("*").single();
    if (error) throw new Error(`companions save: ${error.message}`);
    return this.rowToProfile(data as Row);
  }
  async deleteProfile(userId: string) {
    const db = adminClient();
    await db.from("companion_messages").delete().eq("user_id", userId);
    await db.from("companion_memories").delete().eq("user_id", userId);
    const { error } = await db.from("companions").delete().eq("user_id", userId);
    if (error) throw new Error(`companions delete: ${error.message}`);
  }

  async listMemories(userId: string, companionId: string) {
    const { data, error } = await adminClient().from("companion_memories").select("*").eq("user_id", userId).eq("companion_id", companionId).order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(`companion_memories list: ${error.message}`);
    return (data ?? []).map((r) => ({ id: String(r.id), userId, companionId, memory: String(r.memory), kind: String(r.kind ?? "fact"), importance: Number(r.importance ?? 0.4), createdAt: Date.parse(r.created_at), updatedAt: Date.parse(r.updated_at) }));
  }
  async addMemories(userId: string, companionId: string, items: { memory: string; kind: string; importance: number }[]) {
    if (!items.length) return [];
    const existing = await this.listMemories(userId, companionId);
    const fresh = items.filter((it) => !existing.some((m) => similar(m.memory, it.memory)));
    if (!fresh.length) return [];
    const now = new Date().toISOString();
    const rows = fresh.map((it) => ({ id: newId(), user_id: userId, companion_id: companionId, memory: it.memory, kind: it.kind, importance: it.importance, created_at: now, updated_at: now }));
    const { error } = await adminClient().from("companion_memories").insert(rows);
    if (error) throw new Error(`companion_memories add: ${error.message}`);
    return rows.map((r) => ({ id: r.id, userId, companionId, memory: r.memory, kind: r.kind, importance: r.importance, createdAt: Date.parse(now), updatedAt: Date.parse(now) }));
  }
  async deleteMemory(userId: string, id: string) {
    const { data, error } = await adminClient().from("companion_memories").delete().eq("user_id", userId).eq("id", id).select("id");
    if (error) throw new Error(`companion_memories delete: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
  async clearMemories(userId: string, companionId: string) {
    const { data, error } = await adminClient().from("companion_memories").delete().eq("user_id", userId).eq("companion_id", companionId).select("id");
    if (error) throw new Error(`companion_memories clear: ${error.message}`);
    return data?.length ?? 0;
  }

  async listMessages(userId: string, companionId: string, limit: number) {
    const { data, error } = await adminClient().from("companion_messages").select("*").eq("user_id", userId).eq("companion_id", companionId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(`companion_messages list: ${error.message}`);
    return (data ?? []).reverse().map((r) => ({ id: String(r.id), userId, companionId, role: r.role as "user" | "assistant", content: String(r.content), createdAt: Date.parse(r.created_at), proactive: r.proactive ?? undefined, kind: r.kind ?? undefined }));
  }
  async addMessages(userId: string, companionId: string, items: Omit<CompanionMessage, "userId" | "companionId">[]) {
    if (!items.length) return;
    const rows = items.map((it) => ({ id: it.id ?? newId(), user_id: userId, companion_id: companionId, role: it.role, content: it.content, proactive: it.proactive ?? false, kind: it.kind ?? null, created_at: new Date(it.createdAt).toISOString() }));
    const { error } = await adminClient().from("companion_messages").insert(rows);
    if (error) throw new Error(`companion_messages add: ${error.message}`);
  }
  async clearMessages(userId: string, companionId: string) {
    const { data, error } = await adminClient().from("companion_messages").delete().eq("user_id", userId).eq("companion_id", companionId).select("id");
    if (error) throw new Error(`companion_messages clear: ${error.message}`);
    return data?.length ?? 0;
  }
}

function similar(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const A = new Set(norm(a)), B = new Set(norm(b));
  if (!A.size || !B.size) return false;
  let i = 0; for (const w of A) if (B.has(w)) i++;
  return i / Math.min(A.size, B.size) > 0.75;
}

declare global {
  var __mindeaseCompanionStore: CompanionStore | undefined;
}

/**
 * Supabase store that steps aside if the companion tables have not been
 * created yet ("relation does not exist"): it logs once, loudly, and serves
 * the process from memory so the pages still work while the migration in
 * supabase/migrations/20260906000000_companion.sql is run.
 */
function resilient(primary: CompanionStore): CompanionStore {
  let active: CompanionStore = primary;
  const missing = (e: unknown) => /does not exist|schema cache|PGRST205|42P01/i.test(String((e as Error)?.message ?? e));
  const wrap = <K extends keyof CompanionStore>(k: K): CompanionStore[K] => (async (...args: unknown[]) => {
    try { return await (active[k] as (...a: unknown[]) => Promise<unknown>)(...args); }
    catch (e) {
      if (active === primary && missing(e)) {
        console.error("[companion] Supabase companion tables are missing - run supabase/migrations/20260906000000_companion.sql. Serving companion data from memory until then (it will not persist).");
        active = new MemoryCompanionStore();
        return await (active[k] as (...a: unknown[]) => Promise<unknown>)(...args);
      }
      throw e;
    }
  }) as CompanionStore[K];
  return {
    getProfile: wrap("getProfile"), saveProfile: wrap("saveProfile"), deleteProfile: wrap("deleteProfile"),
    listMemories: wrap("listMemories"), addMemories: wrap("addMemories"), deleteMemory: wrap("deleteMemory"), clearMemories: wrap("clearMemories"),
    listMessages: wrap("listMessages"), addMessages: wrap("addMessages"), clearMessages: wrap("clearMessages"),
  };
}

export function getCompanionStore(): CompanionStore {
  if (globalThis.__mindeaseCompanionStore) return globalThis.__mindeaseCompanionStore;
  const store = supabaseStoreConfigured() ? resilient(new SupabaseCompanionStore()) : new MemoryCompanionStore();
  globalThis.__mindeaseCompanionStore = store;
  return store;
}

/** For tests: a fresh in-memory store. */
export function memoryCompanionStore(): CompanionStore { return new MemoryCompanionStore(); }
