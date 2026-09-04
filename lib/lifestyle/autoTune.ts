/**
 * Ori decides how to behave; the person does not configure it.
 *
 * Every turn and every sweep, the consent block is re-derived from what the
 * person's own history shows:
 *  - quiet hours     ← their inferred sleep window (default 22:30-08:00 until known)
 *  - morning hello   ← only if mornings are part of their active window
 *  - evening check   ← if evenings are their low stretch or their active window
 *  - silence nudge   ← about twice their usual gap between visits, 24-72h
 *  - daily / weekly  ← smaller as reliance climbs (the one thing that must not grow)
 *  - signals         ← typing and voice features are used once their baselines are
 *                      reliable; Ori may mention them only then. Camera stays off.
 *
 * The result is explained in the Mirror in plain words. Nothing here touches
 * the things that are the person's alone: pausing, deleting, exporting.
 */
import { lifestylePatterns } from "./patterns";
import { assessDependency } from "../dependency";
import type { UserState } from "../store/types";

export interface AutoTuneNote { key: string; text: string }

export function autoTune(state: UserState, now = Date.now()): AutoTuneNote[] {
  const life = lifestylePatterns(state.history, state.timeZone, now);
  const userText = state.messages.filter((m) => m.role === "user").slice(-30).map((m) => m.content);
  const dep = assessDependency(state.history, userText, now);
  const c = state.consent;
  const notes: AutoTuneNote[] = [];

  // Quiet hours.
  if (life.facts.sleepWindow) {
    c.quietFrom = round30(life.facts.sleepWindow.from); c.quietTo = round30(life.facts.sleepWindow.to);
    notes.push({ key: "quiet", text: `Quiet hours ${fmt(c.quietFrom)} → ${fmt(c.quietTo)}, learned from when you tend to be away.` });
  } else {
    c.quietFrom = 22.5; c.quietTo = 8;
    notes.push({ key: "quiet", text: "Quiet hours 22:30 → 08:00 until Ori has learned your own rhythm." });
  }

  // Cadence.
  const aw = life.facts.activeWindow;
  c.cadence.morning = life.sufficient ? aw === "mornings" || aw === "spread through the day" : true;
  c.cadence.evening = life.sufficient ? aw === "evenings" || aw === "late nights" || life.facts.lowestPart?.part === "evenings" || life.facts.lowestPart?.part === "late nights" : true;
  const gap = life.facts.usualGapDays;
  c.cadence.inactivityHours = gap ? Math.max(24, Math.min(72, Math.round(gap * 2 * 24))) : 36;
  if (life.sufficient) notes.push({ key: "cadence", text: `${c.cadence.morning ? "A morning hello" : "No morning messages"}${c.cadence.evening ? ", an evening check when the day looks isolated" : ""}, and a nudge after about ${Math.round(c.cadence.inactivityHours / 24)} day${c.cadence.inactivityHours >= 48 ? "s" : ""} of silence - from when you usually come back.` });

  // Budget follows reliance, never the reverse.
  c.enabled = true;
  c.dailyMax = dep.tier === "high" || dep.tier === "elevated" ? 1 : 2;
  c.weeklyBudget = dep.tier === "high" ? 3 : dep.tier === "elevated" ? 5 : dep.tier === "watch" ? 6 : 8;
  if (dep.tier === "elevated" || dep.tier === "high") notes.push({ key: "reliance", text: "Check-ins are rarer right now because you've been here a lot - Ori is trying to be a bridge, not a place to stay." });

  // Signals: derived features only; used once baselines are trustworthy.
  c.typingSignals = true;
  c.voiceSignals = true;
  c.faceSignals = false;
  const reliable = (state.typingBaselines?.ikiMedian?.n ?? 0) >= 8 || (state.prosodyBaselines?.f0Median?.n ?? 0) >= 8;
  c.allowBehaviouralSignals = reliable;
  notes.push({ key: "signals", text: reliable ? "Ori has enough history to read your typing rhythm and tone of voice, and may mention them." : "Ori is still learning your typing rhythm and tone of voice; it won't mention them yet." });

  return notes;
}

const round30 = (h: number) => Math.round(h * 2) / 2;
const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;
