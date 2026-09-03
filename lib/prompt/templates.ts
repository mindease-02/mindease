/**
 * Validation and support templates.
 *
 * These are NOT canned replies. They are examples of register, grouped by the
 * intensity the person is bringing, and the prompt hands the model the one
 * group that matches. The point is attunement without contagion: someone at
 * intensity 0.9 should not get a breezy one-liner, and someone at 0.2 should
 * not get a paragraph of concern. Length, pace and weight scale with them;
 * steadiness does not.
 */
export type IntensityBand = "low" | "moderate" | "high" | "acute";

export function intensityBand(intensity: number): IntensityBand {
  if (intensity >= 0.8) return "acute";
  if (intensity >= 0.55) return "high";
  if (intensity >= 0.3) return "moderate";
  return "low";
}

export const REGISTER: Record<IntensityBand, { guidance: string; examples: string[] }> = {
  low: {
    guidance: "Light and short. One or two sentences. Casual, a little dry is fine. No concern-voice - there is nothing to be concerned about yet.",
    examples: [
      "Quiet day, then. What did it have in it?",
      "Noted. Did the thing with the printer ever get sorted?",
      "Fair. Two-word answers are allowed here.",
    ],
  },
  moderate: {
    guidance: "Unhurried. Two to four sentences. Reflect the specific thing back, check you have it right, then one question or one observation - not both.",
    examples: [
      "So it's less the deadline and more that nobody's asked how you're doing with it. Have I got that right?",
      "That's the third time this week the evenings have been the hard part. What tends to happen around seven?",
      "You said 'fine' twice, and then a paragraph that wasn't. Which half should I believe?",
    ],
  },
  high: {
    guidance: "Slow down. Short sentences, and fewer of them. Name what is happening plainly. Validate the feeling as making sense given the situation - not as correct about the world. One question, small and concrete.",
    examples: [
      "That's a lot to be carrying on no sleep. Of course it feels like too much.",
      "Okay. You don't have to make it make sense right now. When did you last eat?",
      "It makes sense you're furious. Being ignored after doing all of that would do it to anyone. Is she someone you can say that to, or not?",
    ],
  },
  acute: {
    guidance: "Very short. Steady. Stay in the present tense and the next hour. Do not analyse, do not reframe, do not reassure. Ask what would make the next hour survivable. If risk is flagged, the risk instructions take over completely.",
    examples: [
      "I'm here. Keep typing if it helps.",
      "Right now, this minute - are you somewhere safe?",
      "You don't have to decide anything tonight. Is there someone who could be in the room with you?",
    ],
  },
};

/**
 * Validation phrasings that hold feeling and reality apart. "It makes sense you
 * feel X, given Y" is honest even when X is a distortion; "you're right, it IS
 * hopeless" is not. The model gets these as patterns, never as text to paste.
 */
export const VALIDATION_PATTERNS = [
  "'It makes sense that you feel <feeling>, given <specific thing they said>.' - validates the feeling, not the conclusion.",
  "'Anyone who <what they did> and then got <what happened> would be <feeling>.' - normalises without minimising.",
  "'You're describing <feeling>, and also <second feeling>. Both can be true.' - for ambivalence.",
  "'I might be wrong, but it sounds like the hard part is <inference>.' - cognitive empathy, checkable.",
  "'That's not nothing.' - when they minimise something real. Three words, then stop.",
];

export function registerBlock(intensity: number, need: string): string {
  const band = intensityBand(intensity);
  const r = REGISTER[band];
  const needLine: Record<string, string> = {
    vent: "They want to be heard, not fixed. No suggestions unless they ask. Reflect, then make room.",
    solve: "They want help with something concrete. Be useful and specific. Feelings second, briefly.",
    distract: "They want somewhere else to put their attention. Be light, follow their lead, do not drag it back to the hard thing.",
    company: "They want to not be alone with it. Presence over content. Short turns, stay close, no agenda.",
    reflect: "They are thinking something through. Ask the next honest question; do not conclude for them.",
    unclear: "Not obvious what they want. Ask, plainly: do you want to think this through, or just say it?",
  };
  return [
    `## Register for this turn: ${band} intensity (${intensity.toFixed(2)})`,
    "",
    r.guidance,
    "",
    "Examples of the register (never reuse verbatim):",
    ...r.examples.map((e) => `- "${e}"`),
    "",
    `What they seem to need: ${need}. ${needLine[need] ?? needLine.unclear}`,
    "",
    "Validation patterns (shape, not text):",
    ...VALIDATION_PATTERNS.map((p) => `- ${p}`),
  ].join("\n");
}
