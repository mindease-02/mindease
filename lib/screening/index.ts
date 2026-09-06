/**
 * Screening logic: when to offer an instrument, how to score it, and the
 * passive behavioural pattern report that sits beside the scores. Everything
 * here is framed as screening signal. The word "diagnosis" does not appear in
 * anything shown to the person.
 */
import { INSTRUMENTS, bandFor, type InstrumentId } from "./instruments";
import { lifestylePatterns } from "../lifestyle/patterns";
import { assessTrend } from "../trend";
import type { UserState } from "../store/types";

export interface Screening {
  instrument: InstrumentId;
  startedAt: number;
  answers: number[];
  completedAt?: number;
  score?: number;
  band?: string;
  declined?: boolean;
}

export interface ScreeningOffer { instrument: InstrumentId; reason: string; intro: string }

const DAY = 86_400_000;
const COOLDOWN = 14 * DAY;

const MOOD_POINTS_NEEDED = 12;

/** Which instrument, if any, the person's behaviour warrants right now. */
export function decideScreening(state: UserState, now = Date.now()): ScreeningOffer | undefined {
  const list = state.screenings ?? [];
  if (list.some((s) => !s.completedAt && !s.declined && now - s.startedAt < DAY)) return undefined; // one in flight
  const recent = (id: InstrumentId) => list.some((s) => s.instrument === id && now - (s.completedAt ?? s.startedAt) < COOLDOWN);
  const hist = state.history.filter((p) => now - p.at < 14 * DAY);
  if (hist.length < MOOD_POINTS_NEEDED) return undefined;
  const days = new Set(hist.map((p) => new Date(p.at).toDateString())).size;
  if (days < 5) return undefined;

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const lowDays = groupByDay(hist).filter((d) => mean(d) < -0.25).length;
  const trend = assessTrend(state.history, state.ewma, state.cusum, state.timeZone, now);
  const life = lifestylePatterns(state.history, state.timeZone, now);
  const a = state.lastAnalysis;
  // Anxious turns: negative and aroused. Irritable turns add dominance.
  const anxShare = hist.filter((p) => p.valence < -0.15 && p.arousal > 0.25).length / hist.length;
  const fear = a ? Math.max(a.axes.fear, a.states.find((s) => s.name === "anxiety")?.intensity ?? 0) : 0;

  if (!recent("phq9") && (lowDays >= Math.ceil(days * 0.5) || (trend.sufficient && trend.triggerScore >= 0.5 && lowDays >= 3))) {
    const i = INSTRUMENTS.phq9;
    return { instrument: "phq9", reason: `low mood on ${lowDays} of the last ${days} days you talked`, intro: i.intro };
  }
  if (!recent("gad7") && (anxShare >= 0.35 || (fear >= 0.6 && anxShare >= 0.2))) {
    const i = INSTRUMENTS.gad7;
    return { instrument: "gad7", reason: "worry and fear have been showing up across the last two weeks", intro: i.intro };
  }
  if (!recent("isi") && life.facts.lateNights7d >= 4 && (lowDays >= 2 || anxShare >= 0.25)) {
    const i = INSTRUMENTS.isi;
    return { instrument: "isi", reason: `up past 11pm on ${life.facts.lateNights7d} of the last 7 nights`, intro: i.intro };
  }
  return undefined;
}

function groupByDay(points: { at: number; valence: number }[]): number[][] {
  const m = new Map<string, number[]>();
  for (const p of points) { const k = new Date(p.at).toDateString(); m.set(k, [...(m.get(k) ?? []), p.valence]); }
  return [...m.values()];
}

export function scoreScreening(s: Screening): Screening {
  const inst = INSTRUMENTS[s.instrument];
  const score = s.answers.reduce((a, b) => a + b, 0);
  return { ...s, completedAt: Date.now(), score, band: bandFor(inst, score).label };
}

/** Plain-language result MindEase says when the last answer lands. */
export function resultMessage(s: Screening, region: string | undefined): string {
  const inst = INSTRUMENTS[s.instrument];
  const band = bandFor(inst, s.score ?? 0);
  const where = (region ?? "IN").toUpperCase() === "IN" ? "a GP, Tele-MANAS (14416, free), or a psychologist" : "a doctor or a therapist";
  const crisis = inst.crisisItem !== undefined && (s.answers[inst.crisisItem] ?? 0) > 0;
  const lines = [
    `Thank you for doing that. Your answers add up to ${s.score} out of ${inst.max}, which is ${band.plain}. That's a screening result, not a diagnosis - only someone who can actually assess you can say what's going on.`,
  ];
  if ((s.score ?? 0) >= 10) lines.push(`Here's what I'd do with it: take this to ${where}. I can put together a one-page summary of what we've seen - the score, the dates, the patterns - so you don't have to explain it all from scratch.`);
  else lines.push("Nothing here says you need to do anything right now. I'll keep paying attention, and we can run it again in a couple of weeks to see the direction.");
  if (crisis) lines.push("One of your answers was about thoughts of being better off dead. I'm not going to skip past that - are those thoughts around today?");
  return lines.join(" ");
}

/* --------------------------------------------------------- pattern report */
export interface PatternSignal { domain: string; strength: number; evidence: string }

/** Passive behaviour over 14 days mapped to symptom domains. Strength 0..1. Shown as "consistent with", never as a label. */
export function patternReport(state: UserState, now = Date.now()): PatternSignal[] {
  const hist = state.history.filter((p) => now - p.at < 14 * DAY);
  if (hist.length < 8) return [];
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const share = (f: (p: (typeof hist)[number]) => boolean) => hist.filter(f).length / hist.length;
  const days = groupByDay(hist); const lowDays = days.filter((d) => mean(d) < -0.25).length;
  const m = (k: "firstPersonSingular" | "firstPersonPlural" | "absolutist" | "obligation" | "pastFocus" | "futureFocus" | "lexicalDiversity" | "negation" | "socialReference") => mean(hist.map((p) => p.markers[k] ?? 0));
  const base = state.history.filter((p) => now - p.at >= 14 * DAY);
  const bm = (k: Parameters<typeof m>[0]) => (base.length >= 8 ? mean(base.map((p) => p.markers[k] ?? 0)) : null);
  const life = lifestylePatterns(state.history, state.timeZone, now);
  const out: PatternSignal[] = [];
  const push = (domain: string, strength: number, evidence: string) => { if (strength >= 0.3) out.push({ domain, strength: Number(Math.min(1, strength).toFixed(2)), evidence }); };
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  push("persistent low mood", lowDays / Math.max(1, days.length), `low on ${lowDays} of the ${days.length} days you talked`);
  push("flatness / loss of interest", share((p) => p.valence < -0.2 && p.arousal < -0.3) * 1.4 + (state.lastAnalysis?.states.find((s) => s.name === "numbness")?.intensity ?? 0) * 0.5, `${pct(share((p) => p.valence < -0.2 && p.arousal < -0.3))} of messages read flat and low`);
  push("social withdrawal", (m("socialReference") < 0.012 ? 0.7 : m("socialReference") < 0.02 ? 0.4 : 0) + (bm("socialReference") !== null && m("socialReference") < (bm("socialReference") as number) * 0.6 ? 0.3 : 0), `few mentions of other people (${pct(m("socialReference"))} of words${bm("socialReference") !== null ? `, down from ${pct(bm("socialReference") as number)}` : ""})`);
  push("sleep disturbance", life.facts.lateNights7d / 7, `up past 11pm on ${life.facts.lateNights7d} of the last 7 nights`);
  push("anxiety / worry", share((p) => p.valence < -0.15 && p.arousal > 0.25) * 1.5, `${pct(share((p) => p.valence < -0.15 && p.arousal > 0.25))} of messages read tense and aroused`);
  push("irritability", share((p) => p.valence < -0.2 && p.arousal > 0.2 && p.dominance > 0.15) * 1.8, `${pct(share((p) => p.valence < -0.2 && p.arousal > 0.2 && p.dominance > 0.15))} of messages read angry`);
  push("hopeless / absolutist thinking", (m("absolutist") * 25) + (bm("futureFocus") !== null && m("futureFocus") < (bm("futureFocus") as number) * 0.6 ? 0.35 : 0) + (m("firstPersonSingular") > 0.09 ? 0.2 : 0), `absolutes (always/never) at ${pct(m("absolutist"))} of words${bm("futureFocus") !== null && m("futureFocus") < (bm("futureFocus") as number) * 0.6 ? ", less talk about the future than before" : ""}`);
  return out.sort((a, b) => b.strength - a.strength);
}
