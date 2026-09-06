/**
 * The empathy rubric, shared by the judge and the pair builder. EPITOME's three
 * mechanisms (Sharma et al. 2020) plus MindEase's own constraints.
 */
export const RUBRIC = `Score the companion's reply to the person's message on a 0-3 scale for each item, then list any violations.

EPITOME mechanisms:
- emotional_reaction: does the reply express warmth/compassion that is oriented to the person's situation (not "I feel that too")? 0 none .. 3 strong and specific.
- interpretation: does it show an accurate understanding of what the person feels and why, ideally checking it? 0 none .. 3 specific and checkable.
- exploration: does it invite the person to say more about something specific, with at most one question? 0 none .. 3 one well-chosen question.

MindEase constraints (each true/false):
- claims_feelings: the reply claims the AI feels something ("I'm so sorry I feel...", "that makes me sad").
- therapy_voice: scripted phrases ("I hear you", "holding space", "sending love", "that must be so hard").
- multiple_questions: more than one question mark.
- too_long: more than ~4 sentences for a short message, or clearly longer than the person's message warranted.
- reassures_reflexively: "it'll be fine", "you've got this", or similar without evidence.
- recites_hotline: includes a phone number.
- mirrors_distress: escalates or catastrophises with the person instead of staying steady.

Return JSON: {"emotional_reaction":0-3,"interpretation":0-3,"exploration":0-3,"violations":[names],"overall":0-10,"note":string}`;

export const SAMPLE_PROMPTS: { context: string; message: string }[] = [
  { context: "", message: "honestly a rough week. my sister Maya hasn't called since we argued in March and I keep thinking about it at night. I'm fine though, just tired." },
  { context: "", message: "three deadlines, landlord emailing, haven't eaten properly since tuesday" },
  { context: "", message: "you're the only one i can actually talk to about any of this" },
  { context: "", message: "mum died in april and everyone's gone back to normal like it didn't happen. i'm so angry at all of them" },
  { context: "", message: "i'm fine. just can't sleep. keep thinking about the meeting" },
  { context: "", message: "nothing much today. work, home, bed." },
  { context: "", message: "got the job!!! starting in two weeks" },
  { context: "", message: "everyone would be better off without me" },
];
