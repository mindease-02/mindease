/**
 * In-memory store. Per-process, evaporates on restart. Exists so the app runs
 * with zero configuration locally; getStore() warns loudly if it is used in
 * production.
 */
import type { Store, StoredMessage, UserState } from "./types";

export class MemoryStore implements Store {
  private users = new Map<string, UserState>();
  private outbox = new Map<string, StoredMessage[]>();

  async get(userId: string): Promise<UserState | null> {
    const s = this.users.get(userId);
    return s ? structuredClone(s) : null;
  }

  async put(state: UserState): Promise<void> {
    this.users.set(state.userId, structuredClone(state));
  }

  async listActive(limit: number): Promise<string[]> {
    return [...this.users.values()]
      .sort((a, b) => b.lastUserMessageAt - a.lastUserMessageAt)
      .slice(0, limit)
      .map((u) => u.userId);
  }

  async pushOutbox(userId: string, message: StoredMessage): Promise<void> {
    const q = this.outbox.get(userId) ?? [];
    q.push(message);
    this.outbox.set(userId, q);
  }

  async drainOutbox(userId: string): Promise<StoredMessage[]> {
    const q = this.outbox.get(userId) ?? [];
    this.outbox.delete(userId);
    return q;
  }
}
