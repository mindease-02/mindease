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
import { faceReading, type FaceFeatures } from "../affect/face";
import { secondOpinion, assessmentForTier } from "../safety/secondOpinion";
import { lifestylePatterns } from "../lifestyle/patterns";
import { autoTune } from "../lifestyle/autoTune";
import { decideScreening, type ScreeningOffer } from "../screening";
import { INSTRUMENTS, type InstrumentId } from "../screening/instruments";
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
import { HISTORY_LIMIT, MESSAGE_LIMIT, MEMORY_LIMIT, RISK_LOG_LIMIT, INCONGRUENCE_LOG_LIMIT, RATE_LIMIT, type StoredMessage, type UserState } from "../store/types";
import { DAY, HOUR } from "../util/time";

export interface TurnInput {
  userId: string;
  displayName: string;
  text: string;
  timeZone?: string;
  region?: string;
  prosody?: ProsodyFeatures;
  typing?: TypingFeatures;
  face?: FaceFeatures;
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
  /** Set when the model second opinion raised the tier above the regex. */
  riskRaised?: boolean;
  /** The app asks, in the chat, whether a grounding technique would help right now. */
  techniqueOffer?: { reason: string; suggested: ("box" | "sigh" | "ground" | "move")[] };
  /** The app offers a validated screener (PHQ-9 / GAD-7 / ISI) when the pattern warrants it, or when asked. */
  screeningOffer?: ScreeningOffer;
}

const SCREENING_OFFER_GAP = 24 * 60 * 60_000;

/** Explicit requests ("can we do the mood check", "phq") always get the offer. */
function requestedScreening(text: string): InstrumentId | null {
  const t = text.toLowerCase();
  if (/\b(phq|depression (test|check|screen|questionnaire)|mood (check|test|questionnaire|screen))\b/.test(t)) return "phq9";
  if (/\b(gad|anxiety (test|check|screen|questionnaire))\b/.test(t)) return "gad7";
  if (/\b(isi|insomnia|sleep (test|check|screen|questionnaire))\b/.test(t)) return "isi";
  if (/\b(questionnaire|screening|assessment|am i depressed|do i have (depression|anxiety))\b/.test(t)) return "phq9";
  return null;
}

const TECHNIQUE_COOLDOWN = 45 * 60_000;

/**
 * Should the app offer a technique this turn? Only when it is actually
 * warranted: they arrived angry/anxious/restless and this is their first
 * message, or the read is hot and intense. Never during a serious-risk turn
 * (the card takes over), and not more than once per cooldown.
 */
function decideTechniqueOffer(state: UserState, analysis: AffectAnalysis, risk: RiskAssessment, now: number): TurnResult["techniqueOffer"] | undefined {
  if (atLeast(risk.tier, "active")) return undefined;
  if (state.lastTechniqueOfferAt && now - state.lastTechniqueOfferAt < TECHNIQUE_COOLDOWN) return undefined;
  const axes = analysis.axes as unknown as Record<string, number>;
  const st = (n: string) => analysis.states.find((x) => x.name === n)?.intensity ?? 0;
  const anger = Math.max(axes.anger ?? 0, st("frustration"), st("rage"));
  const fear = Math.max(axes.fear ?? 0, st("anxiety"), st("panic"), st("dread"), st("overwhelm"));
  const intense = analysis.intensity >= 0.6;
  const arrival = state.arrival && now - state.arrival.at < 6 * HOUR ? state.arrival.mood : null;
  const turnsSinceArrival = state.arrival ? state.messages.filter((m) => m.role === "user" && m.at >= state.arrival!.at).length : 99;
  const arrivalHot = !!arrival && ["angry", "anxious", "restless"].includes(arrival) && turnsSinceArrival <= 1;
  const hot = (anger >= 0.45 || fear >= 0.5) && intense;
  if (!arrivalHot && !hot) return undefined;
  const kind = arrival === "angry" || (anger >= fear && anger >= 0.45) ? "angry" : arrival === "anxious" || fear >= 0.5 ? "anxious" : "restless";
  const offers = {
    angry: { reason: "Want two minutes to bring the heat down before we go on? Pick one, or keep talking - either's fine.", suggested: ["box", "move", "sigh"] as const },
    anxious: { reason: "Your body's probably ahead of your head right now. Want to slow it down first? Pick one, or just keep going.", suggested: ["sigh", "box", "ground"] as const },
    restless: { reason: "Want to try something with your hands for a minute, or keep talking?", suggested: ["move", "ground", "box"] as const },
  }[kind];
  state.lastTechniqueOfferAt = now;
  return { reason: offers.reason, suggested: [...offers.suggested] };
}

/** Same opener, or a question already asked in the last few replies. */
function isRepetitive(reply: string, recent: string[]): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const opener = (t: string) => norm(t).split(" ").slice(0, 3).join(" ");
  const qs = (t: string) => t.split(/(?<=\?)/).map((q) => norm(q)).filter((q) => q.length > 12);
  const mine = opener(reply);
  if (mine && recent.some((r) => opener(r) === mine)) return true;
  const recentQs = recent.flatMap(qs);
  return qs(reply).some((q) => recentQs.some((r) => r === q || overlap(q, r) >= 0.8));
}
function overlap(a: string, b: string): number {
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  let i = 0; for (const w of A) if (B.has(w)) i++;
  return i / Math.max(1, Math.min(A.size, B.size));
}

export class RateLimitError extends Error {
  constructor(public retryAfterMs: number) { super("Slow down a little - that's a lot of messages in ten minutes."); }
}

export async function loadOrCreate(userId: string, displayName: string, timeZone?: string, region?: string): Promise<UserState> {
  const store = getStore();
  const existing = await store.get(userId);
  if (existing) {
    const s = migrate(existing);
    if (timeZone && s.timeZone !== timeZone) { s.timeZone = timeZone; s.consent.timeZone = timeZone; }
    if (displayName && s.displayName !== displayName) s.displayName = displayName;
    // Transcript retention: drop message text older than the person's setting.
    const keepFrom = Date.now() - (s.consent.retentionDays || 30) * DAY;
    if (s.messages.some((m) => m.at < keepFrom)) s.messages = s.messages.filter((m) => m.at >= keepFrom);
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

  // 0. Rate limit, per person.
  if (now - state.rate.windowStart > RATE_LIMIT.windowMs) state.rate = { windowStart: now, count: 0 };
  state.rate.count++;
  if (state.rate.count > RATE_LIMIT.max) {
    await store.put(state);
    throw new RateLimitError(state.rate.windowStart + RATE_LIMIT.windowMs - now);
  }

  // 1. Risk. Deterministic, first, unsuppressable. The model may only raise it.
  let risk = assessRisk(text);
  const second = await secondOpinion(text, risk);
  if (second.raised) risk = assessmentForTier(second.tier, risk, second.reason);
  if (atLeast(risk.tier, "active")) {
    state.riskLog = [...state.riskLog, { at: now, tier: risk.tier, source: (second.raised ? "model" : "regex") as "model" | "regex", matched: risk.matched, raised: second.raised }].slice(-RISK_LOG_LIMIT);
  }
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
  if (input.face && state.consent.faceSignals) readings.push(faceReading(input.face, now));
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
  autoTune(state, now);
  const life = lifestylePatterns(state.history, state.timeZone, now);
  const techniqueOffer = decideTechniqueOffer(state, analysis, risk, now);
  // Screening: never alongside a technique offer, never during serious risk, at most once a day unless asked.
  let screeningOffer: ScreeningOffer | undefined;
  const asked = requestedScreening(text);
  if (asked && !atLeast(risk.tier, "active")) {
    const inst = INSTRUMENTS[asked];
    screeningOffer = { instrument: asked, reason: "you asked", intro: inst.intro };
  } else if (!techniqueOffer && !atLeast(risk.tier, "active") && (!state.lastScreeningOfferAt || now - state.lastScreeningOfferAt > SCREENING_OFFER_GAP)) {
    screeningOffer = decideScreening(state, now);
  }
  if (screeningOffer) state.lastScreeningOfferAt = now;
  const recentReplies = state.messages.filter((m) => m.role === "assistant").slice(-6).map((m) => m.content);

  // Incongruence calibration: was last turn's flag confirmed or denied? Then the
  // streak - the prompt only gets to mention a mismatch once it has held for two turns.
  const lastInc = state.incongruence.log[state.incongruence.log.length - 1];
  if (lastInc && lastInc.mentioned && lastInc.confirmed === undefined && now - lastInc.at < 2 * HOUR) {
    if (/\b(you'?re right|yeah|yes|true|fair|i guess so|not really fine|not fine)\b/i.test(text)) lastInc.confirmed = true;
    else if (/\b(no|i'?m fine|i am fine|really fine|actually fine|wrong|nope)\b/i.test(text)) lastInc.confirmed = false;
  }
  state.incongruence.streak = incongruent ? state.incongruence.streak + 1 : 0;
  const surfaceIncongruence = incongruent && state.incongruence.streak >= 2;
  if (incongruent) {
    state.incongruence.log = [...state.incongruence.log, { at: now, gap: Number(snapshot.incongruence.magnitude.toFixed(2)), masking: Number(analysis.masking.toFixed(2)), mentioned: surfaceIncongruence }].slice(-INCONGRUENCE_LOG_LIMIT);
  }

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
    surfaceIncongruence,
    arrival: state.arrival && now - state.arrival.at < 6 * HOUR ? state.arrival : undefined,
    recentReplies,
    lifestyle: life.sufficient ? { lines: life.lines, window: life.now.window, predictedLow: life.now.predictedLow } : undefined,
    techniqueOffered: !!techniqueOffer,
    screeningOffered: screeningOffer ? INSTRUMENTS[screeningOffer.instrument].name : undefined,
    lastScreening: (() => { const d = (state.screenings ?? []).filter((x) => x.completedAt && now - x.completedAt! < 3 * DAY).sort((a, b) => b.completedAt! - a.completedAt!)[0]; return d ? { name: INSTRUMENTS[d.instrument].name, score: d.score!, max: INSTRUMENTS[d.instrument].max, band: d.band!, when: d.completedAt! } : undefined; })(),
  });
  const history = context.slice(-16).map((m) => ({ role: m.role, content: m.content }));
  let reply: string;
  const configured = !!llmConfig();
  if (configured) {
    try {
      const msgs = [{ role: "system" as const, content: system }, ...history, { role: "user" as const, content: text }];
      reply = tidy(await complete(msgs, { tier: "chat", temperature: analysis.intensity > 0.7 ? 0.5 : 0.75, maxTokens: 420 }));
      // Repetition guard: same opener or a question already asked → one rewrite with the draft shown.
      if (isRepetitive(reply, recentReplies)) {
        const redo = await complete([...msgs, { role: "system" as const, content: `Your draft repeated how you have opened before, or re-asked a question you already asked:\n"${reply}"\nWrite a different reply: a new first word, a new shape, and no question you have asked in this conversation. Keep it as short.` }],
          { tier: "chat", temperature: 0.9, maxTokens: 420 });
        reply = tidy(redo);
      }
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
    riskRaised: second.raised || undefined,
    techniqueOffer,
    screeningOffer,
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
