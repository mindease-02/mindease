/**
 * Upstash Redis over REST. Hand-rolled rather than pulling in @upstash/redis so
 * the dependency list stays at "Next" - every command here is a single POST.
 *
 * Keys:
 *   me:user:{id}    JSON UserState
 *   me:active       ZSET userId -> lastUserMessageAt (the sweep reads this)
 *   me:outbox:{id}  LIST of JSON StoredMessage, drained by the client
 */
import type { Store, StoredMessage, UserState } from "./types";

type RedisValue = string | number | null | RedisValue[];

export class UpstashStore implements Store {
  constructor(private url: string, private token: string) {}

  private async cmd<T = RedisValue>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`upstash ${args[0]} failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { result?: T; error?: string };
    if (json.error) throw new Error(`upstash ${args[0]}: ${json.error}`);
    return json.result as T;
  }

  async get(userId: string): Promise<UserState | null> {
    const raw = await this.cmd<string | null>("GET", `me:user:${userId}`);
    return raw ? (JSON.parse(raw) as UserState) : null;
  }

  async put(state: UserState): Promise<void> {
    await this.cmd("SET", `me:user:${state.userId}`, JSON.stringify(state));
    await this.cmd("ZADD", "me:active", state.lastUserMessageAt || state.createdAt, state.userId);
  }

  async listActive(limit: number): Promise<string[]> {
    const ids = await this.cmd<string[]>("ZREVRANGE", "me:active", 0, Math.max(0, limit - 1));
    return ids ?? [];
  }

  async pushOutbox(userId: string, message: StoredMessage): Promise<void> {
    await this.cmd("RPUSH", `me:outbox:${userId}`, JSON.stringify(message));
    await this.cmd("EXPIRE", `me:outbox:${userId}`, 7 * 86400);
  }

  async drainOutbox(userId: string): Promise<StoredMessage[]> {
    const key = `me:outbox:${userId}`;
    const items = await this.cmd<string[]>("LRANGE", key, 0, -1);
    if (!items || items.length === 0) return [];
    await this.cmd("LTRIM", key, items.length, -1);
    return items.map((s) => JSON.parse(s) as StoredMessage);
  }
}
