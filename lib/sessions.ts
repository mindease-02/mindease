/**
 * Chat sessions. A session is a thread the person can come back to; the
 * companion's memory, trend and safety state stay global, so a new chat is a
 * fresh screen, not a fresh relationship.
 */
import { SESSION_LIMIT, type ChatSession, type StoredMessage, type UserState } from "./store/types";

export function newSessionId(): string {
  return "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Make sure there is a current session; returns its id. */
export function ensureSession(state: UserState, now = Date.now()): string {
  state.sessions ??= [];
  let cur = state.sessions.find((s) => s.id === state.currentSessionId);
  if (!cur) {
    cur = { id: newSessionId(), title: "", startedAt: now, lastAt: now, count: 0 };
    state.sessions.unshift(cur);
    state.currentSessionId = cur.id;
  }
  return cur.id;
}

export function startSession(state: UserState, now = Date.now()): ChatSession {
  state.sessions ??= [];
  // Reuse an untouched current session rather than stacking empties.
  const cur = state.sessions.find((s) => s.id === state.currentSessionId);
  if (cur && cur.count === 0) { cur.startedAt = now; cur.lastAt = now; return cur; }
  const s: ChatSession = { id: newSessionId(), title: "", startedAt: now, lastAt: now, count: 0 };
  state.sessions.unshift(s);
  state.currentSessionId = s.id;
  trimSessions(state);
  return s;
}

/** Record messages against the current session and keep its title and counts fresh. */
export function noteMessages(state: UserState, msgs: StoredMessage[]): void {
  const id = ensureSession(state);
  const s = state.sessions!.find((x) => x.id === id)!;
  for (const m of msgs) {
    m.sessionId = id;
    s.lastAt = Math.max(s.lastAt, m.at);
    s.count += 1;
    if (!s.title && m.role === "user") s.title = m.content.replace(/\s+/g, " ").trim().slice(0, 48);
  }
}

export function sessionMessages(state: UserState, id = state.currentSessionId): StoredMessage[] {
  if (!id) return [];
  return state.messages.filter((m) => (m.sessionId ?? "s0") === id);
}

export function deleteSession(state: UserState, id: string): void {
  state.sessions = (state.sessions ?? []).filter((s) => s.id !== id);
  state.messages = state.messages.filter((m) => (m.sessionId ?? "s0") !== id);
  if (state.currentSessionId === id) state.currentSessionId = state.sessions[0]?.id;
}

export function switchSession(state: UserState, id: string): boolean {
  if (!(state.sessions ?? []).some((s) => s.id === id)) return false;
  state.currentSessionId = id;
  return true;
}

/** Drop the oldest empty-or-tiny sessions past the cap, and their messages. */
export function trimSessions(state: UserState): void {
  const list = state.sessions ?? [];
  if (list.length <= SESSION_LIMIT) return;
  const sorted = [...list].sort((a, b) => b.lastAt - a.lastAt);
  const keep = new Set(sorted.slice(0, SESSION_LIMIT).map((s) => s.id));
  keep.add(state.currentSessionId ?? "");
  state.sessions = list.filter((s) => keep.has(s.id));
  state.messages = state.messages.filter((m) => keep.has(m.sessionId ?? "s0"));
}

/** The list the client shows: newest first, with a fallback title. */
export function listSessions(state: UserState): ChatSession[] {
  return [...(state.sessions ?? [])].sort((a, b) => b.lastAt - a.lastAt);
}
