/**
 * Keystroke-dynamics channel.
 *
 * This is the cheapest modality to collect and the easiest to get wrong. What it
 * can support: psychomotor speed and hesitancy relative to a person's own norm.
 * What it cannot support: reading emotion off a keyboard. Weighted accordingly -
 * it contributes mostly to arousal and dominance, barely to valence.
 *
 * Only aggregate timings are ever transmitted. Key *identities* are never recorded,
 * because a keystroke stream with content is a keylogger regardless of intent.
 *
 * Evidence base: psychomotor retardation is a DSM criterion for major depression
 * and shows up in typed input as slowed and more variable inter-key intervals and
 * longer pre-send hesitation. The revision signals (backspace rate, churn) track
 * self-monitoring and self-censorship, which rise with social anxiety and shame.
 */
import type { Baseline } from "../util/stats";
import { squashZ, zScore } from "../util/stats";
import type { ChannelReading } from "./types";

export interface TypingFeatures {
  /** Median inter-key interval, ms. */
  ikiMedian: number;
  /** IQR of inter-key intervals, ms - burstiness of production. */
  ikiIqr: number;
  /** Backspaces / total keystrokes. */
  backspaceRate: number;
  /** ms between the assistant's message arriving and the first keypress. */
  latencyToFirstKeyMs: number;
  /** ms between the last keypress and pressing send. Hesitation before committing. */
  preSendPauseMs: number;
  /** (chars typed - chars sent) / chars sent. High = wrote a lot, deleted a lot. */
  churn: number;
  /** Count of pauses longer than 2s mid-message. */
  longPauses: number;
  /** Characters in the final sent message. */
  length: number;
}

export interface TypingBaselines {
  ikiMedian: Baseline;
  ikiIqr: Baseline;
  backspaceRate: Baseline;
  latencyToFirstKeyMs: Baseline;
  preSendPauseMs: Baseline;
  churn: Baseline;
}

const MIN_KEYSTROKES = 12;

export function typingReading(
  f: TypingFeatures,
  base: TypingBaselines,
  at = Date.now(),
): ChannelReading {
  const dead: ChannelReading = {
    channel: "typing",
    vad: { valence: 0, arousal: 0, dominance: 0 },
    precision: { valence: 0, arousal: 0, dominance: 0 },
    coverage: 0,
    at,
    detail: { reason: "message too short for keystroke dynamics" },
  };
  if (f.length < MIN_KEYSTROKES) return dead;

  const z = {
    iki: zScore(base.ikiMedian, f.ikiMedian),
    ikiIqr: zScore(base.ikiIqr, f.ikiIqr),
    backspace: zScore(base.backspaceRate, f.backspaceRate),
    latency: zScore(base.latencyToFirstKeyMs, f.latencyToFirstKeyMs),
    preSend: zScore(base.preSendPauseMs, f.preSendPauseMs),
    churn: zScore(base.churn, f.churn),
  };
  const known = Object.values(z).filter((v) => v !== null).length;
  if (known < 3) {
    return { ...dead, detail: { reason: "personal baseline not established", knownFeatures: known } };
  }
  const zv = (k: keyof typeof z) => z[k] ?? 0;

  // Slower keys, longer latency, more mid-message pausing => lower activation.
  const arousalRaw = -0.34 * zv("iki") - 0.22 * zv("latency") - 0.18 * zv("preSend") + 0.14 * zv("ikiIqr");

  // Hesitation and heavy revision read as reduced agency over what is being said.
  const dominanceRaw = -0.30 * zv("preSend") - 0.28 * zv("churn") - 0.22 * zv("backspace") - 0.18 * zv("latency");

  // Valence from typing is close to unsupportable. We keep a tiny term for the
  // deleted-a-lot-before-sending pattern and give it near-zero precision.
  const valenceRaw = -0.18 * zv("churn") - 0.12 * zv("backspace");

  const dur = Math.min(1, f.length / 220);
  const cov = dur * (known / 6);
  const p = 2.2 * cov;

  return {
    channel: "typing",
    vad: {
      valence: squashZ(valenceRaw),
      arousal: squashZ(arousalRaw),
      dominance: squashZ(dominanceRaw),
    },
    precision: { valence: p * 0.12, arousal: p * 0.75, dominance: p * 0.6 },
    coverage: cov,
    at,
    detail: {
      ikiZ: Number((z.iki ?? 0).toFixed(2)),
      preSendZ: Number((z.preSend ?? 0).toFixed(2)),
      churnZ: Number((z.churn ?? 0).toFixed(2)),
      longPauses: f.longPauses,
      pattern: (zv("preSend") > 1.0 && zv("churn") > 0.8)
        ? "wrote and deleted repeatedly before sending"
        : zv("iki") > 1.2 && zv("latency") > 1.0
        ? "slowed input relative to your baseline"
        : "none",
    },
  };
}

export function emptyTypingBaselines(): TypingBaselines {
  const e = () => ({ samples: [], center: 0, spread: 0, n: 0 });
  return {
    ikiMedian: e(), ikiIqr: e(), backspaceRate: e(),
    latencyToFirstKeyMs: e(), preSendPauseMs: e(), churn: e(),
  };
}
