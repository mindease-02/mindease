/**
 * Model-based affect analysis. The fast tier reads one user turn plus a little
 * context and returns structured JSON. This is the layer that gives the system
 * its wider emotional vocabulary and its theory of mind; the lexical channel in
 * lib/affect stays as the always-on fallback and as an independent check.
 *
 * The output is organised on the ESCAPE / Walla model:
 *   processing - raw, pre-conscious signal. Comes from the behavioural channels
 *                (prosody, typing, lexicon), NOT from this call.
 *   feeling    - the model's best inference of what the person is actually
 *                experiencing, including what they are not saying.
 *   emotion    - what the words *display*: the presented affect.
 * The gap between `feeling` and `expressed` is the model's read on incongruence,
 * which is fused with the behavioural incongruence from lib/affect/fuse.ts.
 */
import { complete, parseJsonObject, llmConfig } from "./index";
import { clampOctant, type Octant } from "../affect/octant";
import type { VAD } from "../affect/types";

/** Nuanced states the model may name. Controlled so the UI can render them. */
export const NUANCED_STATES = [
  "loneliness", "melancholy", "frustration", "anxiety", "dread", "overwhelm", "numbness",
  "exhaustion", "shame", "guilt", "grief", "restlessness", "irritation", "boredom",
  "hope", "relief", "calm", "contentment", "gratitude", "curiosity", "pride",
  "tenderness", "nostalgia", "determination", "ambivalence", "resignation",
] as const;
export type NuancedState = (typeof NUANCED_STATES)[number];

export interface AffectAnalysis {
  at: number;
  source: "model" | "fallback";
  axes: Octant;
  states: { name: NuancedState; intensity: number }[];
  /** Inferred subjective experience (ESCAPE: feeling). */
  feeling: VAD;
  /** Presented affect in the words (ESCAPE: emotion). */
  expressed: { valence: number; arousal: number };
  /** 0..1 - how much the model thinks the words understate or mask the feeling. */
  masking: number;
  maskingNote: string | null;
  /** Theory of mind: a hypothesis about why, from their point of view. */
  why: string;
  /** What they seem to want from the exchange right now. */
  need: "vent" | "solve" | "distract" | "company" | "reflect" | "unclear";
  /** 0..1 - overall emotional intensity; the reply mirrors this. */
  intensity: number;
  /** People, places, events mentioned - hooks for memory and callbacks. */
  mentions: string[];
}

const SYSTEM = `You are an affect analyst inside a mental-wellbeing companion. You read ONE message from a person, with a little recent context, and return a JSON object describing their emotional state. Be precise and cautious; do not diagnose. Empty or trivial messages get low intensities.

Return exactly this shape:
{
  "axes": {"joy":0-1,"trust":0-1,"fear":0-1,"surprise":0-1,"sadness":0-1,"disgust":0-1,"anger":0-1,"anticipation":0-1},
  "states": [{"name": one of [${NUANCED_STATES.join(", ")}], "intensity": 0-1}],   // up to 3, most salient first
  "feeling": {"valence": -1..1, "arousal": -1..1, "dominance": -1..1},              // what they are likely actually experiencing
  "expressed": {"valence": -1..1, "arousal": -1..1},                                  // what the words present on the surface
  "masking": 0-1,          // how much the surface understates/masks the feeling ("I'm fine" after a bad week = high)
  "maskingNote": string|null,  // one short sentence if masking > 0.4, else null
  "why": string,           // 1 sentence, from THEIR point of view: why this feeling makes sense given what they said
  "need": "vent"|"solve"|"distract"|"company"|"reflect"|"unclear",
  "intensity": 0-1,
  "mentions": [string]     // named people, places, events, plans (max 6)
}`;

export async function analyzeAffect(
  text: string,
  context: { role: "user" | "assistant"; content: string }[],
  fallback: { vad: VAD; octant: Octant },
  at = Date.now(),
): Promise<AffectAnalysis> {
  const base: AffectAnalysis = {
    at, source: "fallback", axes: fallback.octant, states: [],
    feeling: fallback.vad,
    expressed: { valence: fallback.vad.valence, arousal: fallback.vad.arousal },
    masking: 0, maskingNote: null, why: "", need: "unclear",
    intensity: Math.min(1, Math.abs(fallback.vad.valence) * 0.6 + Math.abs(fallback.vad.arousal) * 0.4),
    mentions: [],
  };
  if (!llmConfig() || text.trim().length === 0) return base;

  const ctx = context.slice(-6).map((m) => `${m.role === "user" ? "Person" : "Companion"}: ${m.content}`).join("\n");
  try {
    const raw = await complete(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Recent context:\n${ctx || "(none)"}\n\nMessage to analyse:\n"""${text}"""` },
      ],
      { tier: "fast", json: true, temperature: 0.1, maxTokens: 500 },
    );
    const j = parseJsonObject<Record<string, unknown>>(raw);
    if (!j) return base;

    const num = (x: unknown, lo = -1, hi = 1) => {
      const n = Number(x);
      return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
    };
    const vad = (o: unknown): VAD => {
      const v = (o ?? {}) as Record<string, unknown>;
      return { valence: num(v.valence), arousal: num(v.arousal), dominance: num(v.dominance) };
    };
    const states = Array.isArray(j.states)
      ? (j.states as { name?: string; intensity?: number }[])
          .filter((s) => (NUANCED_STATES as readonly string[]).includes(String(s.name)))
          .map((s) => ({ name: s.name as NuancedState, intensity: num(s.intensity, 0, 1) }))
          .slice(0, 3)
      : [];
    const need = ["vent", "solve", "distract", "company", "reflect", "unclear"].includes(String(j.need))
      ? (j.need as AffectAnalysis["need"]) : "unclear";
    const expressed = (j.expressed ?? {}) as Record<string, unknown>;

    return {
      at,
      source: "model",
      axes: clampOctant((j.axes ?? {}) as Record<string, unknown>),
      states,
      feeling: vad(j.feeling),
      expressed: { valence: num(expressed.valence), arousal: num(expressed.arousal) },
      masking: num(j.masking, 0, 1),
      maskingNote: typeof j.maskingNote === "string" && j.maskingNote.trim() ? j.maskingNote.trim() : null,
      why: typeof j.why === "string" ? j.why.trim() : "",
      need,
      intensity: num(j.intensity, 0, 1),
      mentions: Array.isArray(j.mentions) ? (j.mentions as unknown[]).map(String).slice(0, 6) : [],
    };
  } catch (err) {
    console.warn("[analyze] model analysis failed, using lexical fallback:", (err as Error).message);
    return base;
  }
}
