/**
 * Store selection and the default UserState.
 *
 * Upstash Redis when KV_REST_API_URL is configured (needed for cron sweeps to see
 * anyone at all), in-memory otherwise so the app runs locally with zero setup.
 * The in-memory driver is per-instance and evaporates on redeploy - fine for
 * development, useless in production, and it says so loudly at startup.
 */
import { emptyOctant } from "../affect/octant";
import { emptyProsodyBaselines } from "../affect/prosody";
import { emptyTypingBaselines } from "../affect/typing";
import { emptyBandit } from "../proactive/bandit";
import { DEFAULT_CONSENT } from "../proactive/policy";
import { emptyCusum } from "../trend/cusum";
import { emptyEwma } from "../trend/ewma";
import { DEFAULT_REGION } from "../safety/resources";
import { MemoryStore } from "./memory";
import { UpstashStore } from "./upstash";
import { SupabaseStore } from "./supabase";
import { supabaseStoreConfigured } from "../supabase";
import type { Store, UserState } from "./types";

declare global {
  var __mindeaseStore: Store | undefined;
}

export function getStore(): Store {
  if (globalThis.__mindeaseStore) return globalThis.__mindeaseStore;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  let store: Store;
  if (supabaseStoreConfigured()) {
    store = new SupabaseStore();
  } else if (url && token) {
    store = new UpstashStore(url, token);
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[mindease] No KV configured. Running with in-memory state: it is per-instance, " +
        "it disappears on redeploy, and the check-in sweep will find no users. " +
        "Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or KV_REST_API_URL + KV_REST_API_TOKEN).",
      );
    }
    store = new MemoryStore();
  }
  globalThis.__mindeaseStore = store;
  return store;
}

export function newUserState(
  userId: string,
  displayName: string,
  timeZone = "UTC",
  region?: string,
  proactive = true,
): UserState {
  return {
    userId,
    displayName,
    createdAt: Date.now(),
    timeZone,
    region: region || DEFAULT_REGION,
    consent: {
      ...DEFAULT_CONSENT,
      enabled: proactive,
      timeZone,
      // Transcript storage is on so the companion can remember the conversation
      // between sessions; the behavioural channels start off. Each is a switch in
      // the Mirror panel with a plain-language explanation of what it does.
      storeTranscript: true,
      voiceSignals: false,
      typingSignals: false,
      faceSignals: false,
      pushNotifications: false,
      retentionDays: 30,
    },
    history: [],
    messages: [],
    ewma: emptyEwma(),
    cusum: emptyCusum(0),
    octant: emptyOctant(),
    prosodyBaselines: emptyProsodyBaselines(),
    typingBaselines: emptyTypingBaselines(),
    outreach: [],
    bandit: emptyBandit(),
    risk: { tier: "none", at: 0 },
    lastUserMessageAt: 0,
    memories: [],
    cadenceLog: {},
    riskLog: [],
    incongruence: { streak: 0, log: [] },
    push: [],
    rate: { windowStart: 0, count: 0 },
  };
}

/** Fill in fields added after a user's state was first written. */
export function migrate(s: UserState): UserState {
  return {
    ...s,
    displayName: s.displayName ?? "you",
    octant: s.octant ?? emptyOctant(),
    memories: s.memories ?? [],
    cadenceLog: s.cadenceLog ?? {},
    riskLog: s.riskLog ?? [],
    incongruence: s.incongruence ?? { streak: 0, log: [] },
    push: s.push ?? [],
    rate: s.rate ?? { windowStart: 0, count: 0 },
    consent: {
      ...DEFAULT_CONSENT,
      storeTranscript: true, voiceSignals: false, typingSignals: false, faceSignals: false, pushNotifications: false, retentionDays: 30,
      ...(s.consent as Partial<UserState["consent"]>),
      cadence: { ...DEFAULT_CONSENT.cadence, ...(s.consent?.cadence ?? {}) },
    },
  };
}
