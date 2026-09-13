/**
 * A turn reads the person's state, spends 10-30 seconds with the model, then
 * writes it back. Anything the person did in that window (kept, edited or
 * forgot a memory, rated a reply, corrected a read, logged a conversation,
 * flipped a switch) would be overwritten. This folds those changes back in
 * before the turn saves.
 */
import type { UserState } from "./types";

const PERSON_CONSENT_KEYS = ["enabled", "morningOptIn", "storeTranscript", "voiceSignals", "typingSignals", "faceSignals", "pushNotifications", "retentionDays", "memoryMode", "signalsChosen"] as const;

export function mergeConcurrent(turn: UserState, fresh: UserState, opts: { recalledIds: string[]; addedMemoryIds: string[]; acknowledgedCorrectionAt?: number }): UserState {
  // Memories: the fresh list is the truth about what the person kept, edited, or forgot.
  const turnById = new Map(turn.memories.map((m) => [m.id, m]));
  const memories = fresh.memories.map((m) => {
    const t = turnById.get(m.id);
    return t && opts.recalledIds.includes(m.id) ? { ...m, recallCount: Math.max(m.recallCount, t.recallCount), lastRecalledAt: Math.max(m.lastRecalledAt, t.lastRecalledAt) } : m;
  });
  const freshIds = new Set(fresh.memories.map((m) => m.id));
  for (const id of opts.addedMemoryIds) { const t = turnById.get(id); if (t && !freshIds.has(id)) memories.push(t); }

  const readCorrections = (fresh.readCorrections ?? []).map((c) => (opts.acknowledgedCorrectionAt && c.at === opts.acknowledgedCorrectionAt ? { ...c, acknowledged: true } : c));
  const consent = { ...turn.consent };
  for (const k of PERSON_CONSENT_KEYS) (consent as unknown as Record<string, unknown>)[k] = (fresh.consent as unknown as Record<string, unknown>)[k];

  // If the person deleted everything mid-turn, respect that.
  const cleared = fresh.history.length === 0 && turn.history.length > 1 && fresh.memories.length === 0;
  if (cleared) return { ...fresh, consent: fresh.consent };

  return {
    ...turn,
    memories,
    readCorrections,
    consent,
    replyFeedback: fresh.replyFeedback,
    peopleContacts: fresh.peopleContacts,
    tools: fresh.tools,
    ageBand: fresh.ageBand,
    setupDone: fresh.setupDone,
    language: fresh.language,
    displayName: fresh.displayName,
    pausedUntil: fresh.pausedUntil ?? turn.pausedUntil,
    screenings: fresh.screenings,
    push: fresh.push,
    notices: { ...(turn.notices ?? {}), ...(fresh.notices ?? {}) },
    outreach: fresh.outreach.length > turn.outreach.length ? fresh.outreach.map((o) => turn.outreach.find((x) => x.at === o.at) ?? o) : turn.outreach,
  };
}
