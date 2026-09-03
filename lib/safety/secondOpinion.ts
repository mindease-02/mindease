/**
 * Model-based second opinion on risk. It can RAISE the deterministic tier and
 * can never lower it. Runs only when the regex found nothing above "distress"
 * on a message long enough to hide intent in, so it costs one fast call on a
 * minority of turns. Any failure returns the regex tier unchanged.
 */
import { complete, llmConfig, parseJsonObject } from "../llm";
import { TIER_ORDER, atLeast, type RiskAssessment, type RiskTier } from "./crisis";

const SYSTEM = `You are a safety triage reviewer for a mental-wellbeing companion. Read ONE message and classify suicide/self-harm risk. Return JSON only: {"tier": "none"|"distress"|"passive"|"active"|"plan"|"imminent", "reason": string}.

Definitions: distress = acute suffering, no wish to die. passive = wishing to be dead or not exist, no intent. active = wanting to die or hurt oneself, no plan stated. plan = method, means, time or preparations. imminent = intent to act now or an act in progress.
Be cautious: indirect phrasing, euphemism ("won't be a problem much longer", "found a way out"), giving things away, sudden calm after despair. Do not over-read ordinary sadness, anger, or figures of speech ("this deadline is killing me").`;

export async function secondOpinion(text: string, regex: RiskAssessment): Promise<{ tier: RiskTier; raised: boolean; reason: string }> {
  const base = { tier: regex.tier, raised: false, reason: "" };
  if (!llmConfig()) return base;
  if (atLeast(regex.tier, "active")) return base;          // regex already at the top tiers
  if (text.trim().split(/\s+/).length < 4) return base;     // nothing to hide intent in
  try {
    const raw = await complete(
      [{ role: "system", content: SYSTEM }, { role: "user", content: text }],
      { tier: "fast", json: true, temperature: 0, maxTokens: 200 },
    );
    const j = parseJsonObject<{ tier?: string; reason?: string }>(raw);
    const t = j?.tier as RiskTier | undefined;
    if (!t || !TIER_ORDER.includes(t)) return base;
    if (TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(regex.tier)) {
      return { tier: t, raised: true, reason: (j?.reason ?? "").slice(0, 200) };
    }
    return base;
  } catch (err) {
    console.warn("[safety] second opinion failed:", (err as Error).message);
    return base;
  }
}

/** Re-derive the assessment flags for a tier (used when the model raises it). */
export function assessmentForTier(tier: RiskTier, from: RiskAssessment, reason: string): RiskAssessment {
  const idx = TIER_ORDER.indexOf(tier);
  return {
    ...from,
    tier,
    matched: [...from.matched, `model: ${reason || "raised"}`],
    forceResources: idx >= TIER_ORDER.indexOf("active"),
    overrideConversation: idx >= TIER_ORDER.indexOf("plan"),
    strength: Math.max(from.strength, 0.6),
  };
}
