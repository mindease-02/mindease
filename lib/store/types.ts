/**
 * Persistence.
 *
 * Data minimisation is a design constraint, not a policy page. What is stored:
 *  - MoodPoints: a timestamp, three floats, eight axis values, a confidence,
 *    and ten marker rates.
 *  - Baselines: at most 120 numbers per feature, robust statistics only.
 *  - Outreach records and bandit posteriors.
 *  - Memories: short LLM-extracted facts the person chose to share, with a
 *    256-dim hashed embedding. Deletable one by one from the Mirror panel.
 *  - Raw message text ONLY inside the rolling conversation window, and only if
 *    the user has turned on history.
 *
 * What is never stored: audio, keystroke identities, embeddings of anyone's voice.
 */
import type { BanditState } from "../proactive/bandit";
import type { OutreachRecord, ProactiveConsent } from "../proactive/policy";
import type { ProsodyBaselines } from "../affect/prosody";
import type { TypingBaselines } from "../affect/typing";
import type { OctantState } from "../affect/octant";
import type { CusumState } from "../trend/cusum";
import type { EwmaState } from "../trend/ewma";
import type { MoodPoint } from "../trend";
import type { RiskTier } from "../safety/crisis";
import type { MemoryItem } from "../memory";
import type { AffectAnalysis } from "../llm/analyze";

/** Audit entry for every turn at tier >= active (regex or model second opinion). */
export interface RiskLogEntry {
  at: number;
  tier: RiskTier;
  source: "regex" | "model";
  matched: string[];
  /** True if the model raised the tier above what the regex found. */
  raised?: boolean;
}

/** Calibration record for the incongruence detector. */
export interface IncongruenceEntry {
  at: number;
  gap: number;
  masking: number;
  /** Was it surfaced in the prompt this turn? */
  mentioned: boolean;
  /** Filled in on the next turn if the user confirmed or denied it. */
  confirmed?: boolean;
}

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  addedAt: number;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  at: number;
  /** Set on assistant turns that were unprompted. */
  proactive?: boolean;
  /** Which check-in style produced it, for the "not useful" feedback button. */
  kind?: string;
}

export interface UserState {
  userId: string;
  displayName: string;
  createdAt: number;
  timeZone: string;
  region?: string;
  consent: ProactiveConsent & {
    /** Store message text at all. Off => only MoodPoints are kept. */
    storeTranscript: boolean;
    /** Microphone-derived features may be computed and sent. */
    voiceSignals: boolean;
    /** Keystroke timing may be computed and sent. */
    typingSignals: boolean;
    /** Camera-derived expression (two numbers per message) may be computed and sent. */
    faceSignals: boolean;
    /** Unprompted messages may arrive as OS notifications when the tab is closed. */
    pushNotifications: boolean;
    /** Transcript retention in days. Messages older than this are dropped on load. */
    retentionDays: number;
  };
  history: MoodPoint[];
  messages: StoredMessage[];
  ewma: EwmaState;
  cusum: CusumState;
  /** Eight-axis emotional state, time-decayed. */
  octant: OctantState;
  prosodyBaselines: ProsodyBaselines;
  typingBaselines: TypingBaselines;
  outreach: OutreachRecord[];
  bandit: BanditState;
  risk: { tier: RiskTier; at: number };
  lastUserMessageAt: number;
  /** Last time the sweep or the client evaluated this user for a check-in. */
  lastEvaluatedAt?: number;
  /** Set when the user asks to be left alone for a while. Absolute. */
  pausedUntil?: number;
  /** Long-term memory. */
  memories: MemoryItem[];
  /** Most recent model-based read of the person, for the Mirror panel. */
  lastAnalysis?: AffectAnalysis;
  /** Days on which a morning/evening check-in already went out (YYYY-MM-DD local). */
  cadenceLog: { morning?: string; evening?: string };
  /** Audit log of serious-risk turns. Visible in the Mirror. */
  riskLog: RiskLogEntry[];
  /** Incongruence: how many consecutive turns it fired, and the calibration log. */
  incongruence: { streak: number; log: IncongruenceEntry[] };
  /** Web Push subscriptions (this person's devices). */
  push: PushSub[];
  /** Per-user rate limiting window for /api/chat. */
  rate: { windowStart: number; count: number };
}

export interface Store {
  get(userId: string): Promise<UserState | null>;
  put(state: UserState): Promise<void>;
  /** Users the sweep should evaluate. */
  listActive(limit: number): Promise<string[]>;
  /** Queued proactive messages the client picks up. */
  pushOutbox(userId: string, message: StoredMessage): Promise<void>;
  drainOutbox(userId: string): Promise<StoredMessage[]>;
}

export const HISTORY_LIMIT = 900;
export const MESSAGE_LIMIT = 120;
export const MEMORY_LIMIT = 400;
export const RISK_LOG_LIMIT = 50;
export const INCONGRUENCE_LOG_LIMIT = 60;
export const RATE_LIMIT = { windowMs: 10 * 60_000, max: 40 };
