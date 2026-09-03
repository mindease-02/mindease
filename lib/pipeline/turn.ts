/**
 * One user turn, end to end.
 *
 *   risk gate -> affect (lexical + behavioural fusion) -> model analysis ->
 *   state update (mood, trend, 8-axis, baselines) -> memory retrieval ->
 *   prompt -> reply -> memory extraction -> persist
 *
 * Risk runs first and deterministically. Nothing later in the pipeline can
 * suppress it.
 */
import { analyzeText } from "../affect/textAffect";
import { loadTextModels } from "../affect/models";
import { buildSnapshot } from "../affect/fuse";
import { prosodyReading, type ProsodyFeatures } from "../affect/prosody";
import { typingReading, type TypingFeatures } from "../affect/typing";
import { octantFromVAD, updateOctant } from "../affect/octant";
import type { ChannelReading, VAD } from "../affect/types";
import { updateBaseline } from "../util/stats";
import { assessRisk, atLeast, type RiskAssessment } from "../safety/crisis";
import { helplinesFor, emergencyFor, type Helpline } from "../safety/resources";
import { assessTrend, type MoodPoint, type TrendAssessment } from "../trend";
import { updateEwma } from "../trend/ewma";
import { updateCusum, rebaseline } from "../trend/cusum";
import { assessDependency, type DependencyAssessment } from "../dependency";
import { analyzeAffect, type AffectAnalysis } from "../llm/analyze";
import { complete, llmConfig } from "../llm";
import { addMemories, anchors, markRecalled, retrieve } from "../memory";
import { extractMemories } from "../memory/extract";
import { pickReminiscence } from "../memory/reminiscence";
import { buildSystemPrompt, AGENT_NAME } from "../prompt/persona";
import { getStore, migrate, newUserState } from "../store";
import { HISTORY_LIMIT, MESSAGE_LIMIT, MEMORY_LIMIT, type StoredMessage, type UserState } from "../store/types";
import { DAY, HOUR } from "../util/time";

export interface TurnInput {
  userId: string;
  displayName: string;
  text: string;
  timeZone?: string;
  region?: string;
  prosody?: ProsodyFeatures;
  typing?: TypingFeatures;
  /** Messages the client is holding but the server may not (no transcript storage). */
  clientContext?: { role: "user" | "assistant"; content: string }[];
}

export interface TurnResult {
  reply: string;
  at: number;
  risk: RiskAssessment;
  helplines: Helpline[] | null;
  emergency: string;
  analysis: AffectAnalysis;
  vad: VAD;
  confidence: number;
  incongruent: boolean;
  trend: { triggerScore: number; agreement: number; evidence: string[]; sufficient: boolean };
  dependency: { tier: string; index: number; reasons: string[] };
  memoriesUsed: { id: string; text: string }[];
  newMemories: { id: string; text: string; kind: string }[];
  llmConfigured: boolean;
}

export async function loadOrCreate(userId: string, displayName: string, timeZone?: string, region?: string): Promise<UserState> {
  const store = getStore();
  const existing = await store.get(userId);
  if (existing) {
    const s = migrate(existing);
    if (timeZone && s.timeZone !== timeZone) { s.timeZone = timeZone; s.consent.timeZone = timeZone; }
    if (displayName && s.displayName !== displayName) s.displayName = displayName;
    return s;
  }
  const fresh = newUserState(userId, displayName, timeZone ?? "UTC", region);
  await store.put(fresh);
  return fresh;
}

export async function runTurn(input: TurnInput): Promise<TurnResult> {
  const now = Date.now();
  const store = getStore();
  const state = await loadOrCreate(input.userId, input.displayName, input.timeZone, input.region);
  const text = input.text.trim();

  // 1. Risk. Deterministic, first, unsuppressable.
  const risk = assessRisk(text);
  if (atLeast(risk.tier, "passive") && (risk.tier !== state.risk.tier || now - state.risk.at > 2 * DAY)) {
    state.risk = { tier: risk.tier, at: now };
  } else if (atLeast(risk.tier, state.risk.tier) && risk.tier !== "none") {
    state.risk = { tier: risk.tier, at: now };
  }

  // 2. Affect: lexical channel plus whatever behavioural channels are consented.
  const ta = analyzeText(text, loadTextModels(), now);
  const readings: ChannelReading[] = [ta.reading];
  if (input.prosody && state.consent.voiceSignals) {
    readings.push(prosodyReading(input.prosody, state.prosodyBaselines, now));
    const b = state.prosodyBaselines, f = input.prosody;
    if (f.voicedSeconds >= 1.8) {
      state.prosodyBaselines = {
        f0Median: updateBaseline(b.f0Median, f.f0Median), f0Iqr: updateBaseline(b.f0Iqr, f.f0Iqr),
        intensity: updateBaseline(b.intensity, f.intensity), speechRate: updateBaseline(b.speechRate, f.speechRate),
        pauseRatio: updateBaseline(b.pauseRatio, f.pauseRatio), meanPauseMs: updateBaseline(b.meanPauseMs, f.meanPauseMs),
        jitter: updateBaseline(b.jitter, f.jitter), spectralCentroid: updateBaseline(b.spectralCentroid, f.spectralCentroid),
      };
    }
  }
  if (input.typing && state.consent.typingSignals) {
    readings.push(typingReading(input.typing, state.typingBaselines, now));
    const b = state.typingBaselines, f = input.typing;
    if (f.length >= 12) {
      state.typingBaselines = {
        ikiMedian: updateBaseline(b.ikiMedian, f.ikiMedian), ikiIqr: updateBaseline(b.ikiIqr, f.ikiIqr),
        backspaceRate: updateBaseline(b.backspaceRate, f.backspaceRate),
        latencyToFirstKeyMs: updateBaseline(b.latencyToFirstKeyMs, f.latencyToFirstKeyMs),
        preSendPauseMs: updateBaseline(b.preSendPauseMs, f.preSendPauseMs), churn: updateBaseline(b.churn, f.churn),
      };
    }
  }
  const snapshot = buildSnapshot(readings, ta.emotions, ta.markers, now);

  // 3. Model analysis (wider vocabulary, ESCAPE split, theory of mind), with the
  //    lexical read as its fallback. Runs alongside memory extraction.
  const context = (state.consent.storeTranscript ? state.messages : (input.clientContext ?? []))
    .slice(-10).map((m) => ({ role: m.role, content: m.content }));
  const [analysis, extracted] = await Promise.all([
    analyzeAffect(text, context, { vad: snapshot.vad, octant: octantFromVAD(snapshot.vad) }, now),
    extractMemories(text, now),
  ]);

  // Fuse: the model's inferred feeling is another observation of the same latent.
  const modelW = analysis.source === "model" ? 0.55 : 0;
  const vad: VAD = {
    valence: snapshot.vad.valence * (1 - modelW) + analysis.feeling.valence * modelW,
    arousal: snapshot.vad.arousal * (1 - modelW) + analysis.feeling.arousal * modelW,
    dominance: snapshot.vad.dominance * (1 - modelW) + analysis.feeling.dominance * modelW,
  };
  const confidence = Math.max(snapshot.confidence, analysis.source === "model" ? Math.min(0.85, 0.45 + ta.reading.coverage * 0.5) : 0);
  const incongruent = snapshot.incongruence.present || analysis.masking > 0.6;

  // 4. State update.
  const point: MoodPoint = {
    at: now, valence: vad.valence, arousal: vad.arousal, dominance: vad.dominance,
    confidence, markers: ta.markers, incongruent,
  };
  state.history = [...state.history, point].slice(-HISTORY_LIMIT);
  state.ewma = updateEwma(state.ewma, vad.valence, now, confidence);
  state.cusum = updateCusum(state.cusum, vad.valence, now);
  if (!state.cusum.alarm && state.history.length >= 20 && state.history.length % 20 === 0) {
    state.cusum = rebaseline(state.cusum, state.history.slice(-40).map((p) => p.valence));
  }
  state.octant = updateOctant(state.octant, analysis.axes, now, confidence);
  state.lastAnalysis = analysis;

  // Engagement bookkeeping for the last unprompted message.
  const lastOut = state.outreach[state.outreach.length - 1];
  if (lastOut && lastOut.engaged === undefined && now - lastOut.at < 24 * HOUR) lastOut.engaged = true;

  // "Leave me alone for a bit."
  const pause = /\b(leave me alone|stop (checking|messaging)|don'?t (check in|message me)|need (some )?space)\b/i.exec(text);
  if (pause) state.pausedUntil = now + 3 * DAY;

  // 5. Trend and dependency.
  const trend = assessTrend(state.history, state.ewma, state.cusum, state.timeZone, now);
  const recentUserText = state.messages.filter((m) => m.role === "user").slice(-30).map((m) => m.content).concat(text);
  const dependency = assessDependency(state.history, recentUserText, now);

  // 6. Memory: retrieve for this turn, then merge what was just learned.
  const query = [text, ...analysis.mentions].join(" ");
  const retrieved = retrieve(state.memories, query, 6, now).map((r) => r.item);
  const anchor = anchors(state.memories, 3).filter((a) => !retrieved.some((r) => r.id === a.id));
  const memoriesUsed = [...retrieved, ...anchor];
  state.memories = markRecalled(state.memories, memoriesUsed.map((m) => m.id), now);

  const sessionStart = now - 45 * 60 * 1000;
  const turnsThisSession = state.history.filter((p) => p.at >= sessionStart).length;
  const reminiscence = pickReminiscence(state.memories, {
    valence: vad.valence, riskTier: risk.tier, need: analysis.need, turnsThisSession,
  }, now);

  // 7. Reply.
  const system = buildSystemPrompt({
    snapshot, trend, dependency, risk, region: state.region,
    allowBehaviouralSignals: state.consent.allowBehaviouralSignals,
    analysis, octant: state.octant, memories: memoriesUsed, reminiscence,
    displayName: state.displayName, localTime: localTimeString(now, state.timeZone),
  });
  const history = context.slice(-16).map((m) => ({ role: m.role, content: m.content }));
  let reply: string;
  const configured = !!llmConfig();
  if (configured) {
    try {
      reply = await complete([{ role: "system", content: system }, ...history, { role: "user", content: text }],
        { tier: "chat", temperature: analysis.intensity > 0.7 ? 0.5 : 0.75, maxTokens: 420 });
      reply = tidy(reply);
    } catch (err) {
      console.error("[turn] LLM failed:", (err as Error).message);
      reply = fallbackReply(risk, state.displayName);
    }
  } else {
    reply = `(${AGENT_NAME} is not connected to a language model yet - add GROQ_API_KEY to .env.local.) ` + fallbackReply(risk, state.displayName);
  }

  // 8. Persist.
  state.memories = addMemories(state.memories, extracted, MEMORY_LIMIT);
  const userMsg: StoredMessage = { role: "user", content: text, at: now };
  const aiMsg: StoredMessage = { role: "assistant", content: reply, at: Date.now() };
  if (state.consent.storeTranscript) state.messages = [...state.messages, userMsg, aiMsg].slice(-MESSAGE_LIMIT);
  state.lastUserMessageAt = now;
  await store.put(state);

  return {
    reply, at: aiMsg.at, risk,
    helplines: risk.forceResources || atLeast(state.risk.tier, "active") && now - state.risk.at < 6 * HOUR ? helplinesFor(state.region) : null,
    emergency: emergencyFor(state.region),
    analysis, vad, confidence, incongruent,
    trend: { triggerScore: trend.triggerScore, agreement: trend.agreement, evidence: trend.evidence, sufficient: trend.sufficient },
    dependency: { tier: dependency.tier, index: dependency.index, reasons: dependency.reasons },
    memoriesUsed: memoriesUsed.map((m) => ({ id: m.id, text: m.text })),
    newMemories: extracted.map((m) => ({ id: m.id, text: m.text, kind: m.kind })),
    llmConfigured: configured,
  };
}

export function localTimeString(at: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(at));
  } catch { return new Date(at).toUTCString(); }
}

function tidy(s: string): string {
  return s.replace(/^\s*(Ori|Assistant)\s*:\s*/i, "").replace(/\n{3,}/g, "\n\n").trim();
}

function fallbackReply(risk: RiskAssessment, name: string): string {
  if (atLeast(risk.tier, "active")) {
    return "I can't reach my language model right now, but what you just said matters more than that. The crisis lines on screen are real people, available now. Please use one, and if you're in immediate danger, call emergency services.";
  }
  return `I'm here, ${name}. I'm having trouble forming a proper reply at the moment - say it again in a minute, or keep going and I'll catch up.`;
}

export { type TrendAssessment, type DependencyAssessment };
