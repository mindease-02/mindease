import type { Turn } from "./AnnotatedChat";

export interface Scenario {
  id: string;
  kicker: string;
  card: string;
  title: string;
  intro: string;
  how: string[];
  turns: Turn[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "stress", kicker: "Stress", card: "clay-amber",
    title: "When everything is due at once",
    intro: "Stress is usually a sequencing problem wearing a catastrophe costume. Ori looks for the first thing, and notices when basics - food, sleep, daylight - have quietly dropped off the list.",
    how: [
      "The message is read for intensity and for what the person needs: here it scores as overwhelm at high intensity, and the need is to solve, not to vent.",
      "Because the need is 'solve', Ori answers with one concrete question instead of sympathy - and only one, because stacked questions raise the load.",
      "'Haven't eaten since Tuesday' is a basic-needs marker; it outranks the deadlines, so the second reply pivots to food before work.",
    ],
    turns: [
      { who: "you", text: "three deadlines, landlord emailing, haven't eaten properly since tuesday" },
      { who: "ori", text: "That's a lot stacked on no food. Which of the three is actually due first?",
        read: "overwhelm 0.7, anxiety 0.4 · intensity high · need: solve · basic needs flagged (food)",
        move: "match the weight, then one sequencing question - no reassurance, no list of tips" },
      { who: "you", text: "the report. friday" },
      { who: "ori", text: "Then the landlord and the other two can wait until you've eaten something. What's in the kitchen right now?",
        read: "intensity dropping (short, factual answer) · food still unaddressed",
        move: "name the order out loud, then the smallest physical next step" },
    ],
  },
  {
    id: "anxiety", kicker: "Anxiety", card: "clay-haze",
    title: "When 'fine' isn't",
    intro: "Ori compares what you write with what you show - the words, the tone of voice, the way you type - and asks about the gap once, without insisting it knows better than you.",
    how: [
      "The words say 'fine' but the surface and the inferred feeling disagree: the model reports masking of 0.6, and a flat, hesitant typing rhythm (if you've allowed it) agrees.",
      "Incongruence never overrides what you said. It lowers Ori's confidence and turns into a question you can wave away.",
      "Fear is validated as making sense given the situation - not as being right about the world - and then you look at the evidence together.",
    ],
    turns: [
      { who: "you", text: "i'm fine. just can't sleep. keep thinking about the meeting" },
      { who: "ori", text: "You've said 'fine' and then described a night of not sleeping. Which half should I believe?",
        read: "surface valence −0.1, felt valence −0.6 · masking 0.6 · anxiety 0.7, dread 0.4",
        move: "hold both readings; name the gap once, as a question; accept the answer" },
      { who: "you", text: "ok not fine. i think they're going to let me go" },
      { who: "ori", text: "It makes sense you're braced for it, after the way last month went. What's the actual evidence, either way?",
        read: "fear + anticipation → anxiety dyad · memory: 'last month' review went badly · need: reflect",
        move: "validate the feeling, not the conclusion; then one evidence question" },
    ],
  },
  {
    id: "depression", kicker: "Depression", card: "clay-sage",
    title: "When you've gone quiet",
    intro: "Low mood hides in the pattern, not the message: shorter replies, later nights, fewer people mentioned. Ori tracks that across days and reaches out when the trend is real - not because a timer went off.",
    how: [
      "Four detectors watch the multi-day series - momentum, a monotone-trend test, a change-point detector, and behavioural withdrawal. Two must agree before anything is sent.",
      "The unprompted message says exactly what was noticed and asks whether it's right. If you don't answer, it stops.",
      "Every suggestion points outward - a doorstep, one text to a named person - and the follow-up is about that, not about the chat.",
    ],
    turns: [
      { who: "ori", proactive: true, text: "Your messages have been getting shorter in the evenings this week, and you haven't mentioned Sam since the weekend. Am I reading that right?",
        read: "trend score 0.68, 3 of 4 detectors agree · session length −45% · social reference ↓ · memory: Sam",
        move: "observation style: name the evidence, check it, stop" },
      { who: "you", text: "yeah. haven't really felt like anything" },
      { who: "ori", text: "Okay. You don't have to feel like it. When did you last go outside - even the doorstep?",
        read: "numbness 0.6, sadness 0.5 · arousal low · need: company",
        move: "no fixing; one small concrete question about the body, not the mood" },
      { who: "you", text: "monday maybe" },
      { who: "ori", text: "Monday. Would you text Sam one line today? I'll ask how that went, not how this went.",
        read: "reliance: watch tier (here more, mentioning people less)",
        move: "bridge: aim at one person, and make the next check-in about them" },
    ],
  },
  {
    id: "loneliness", kicker: "Loneliness", card: "clay-peach",
    title: "When there's nobody to tell",
    intro: "A companion that is always available can quietly become the only one. Ori measures that and, when reliance climbs, becomes a bridge to people rather than a comfortable place to stay.",
    how: [
      "'You're the only one I can talk to' is an exclusivity phrase; it raises the dependency index. Ori says the pattern out loud instead of enjoying it.",
      "It asks for a name, not 'do you have support' - specific beats general, and a named human in the conversation is worth more than anything Ori can say.",
      "Ori stays warm but declines to be the primary support, with a fixed, reviewed statement of what it is.",
    ],
    turns: [
      { who: "you", text: "honestly you're the only one i can talk to about any of this" },
      { who: "ori", text: "I'm glad it helps to say it here. I also want to be straight: I'm software, and I'd be doing you harm if I let myself become the main one. Who's the last person you told something real to - even a while ago?",
        read: "exclusivity phrase matched · dependency 0.52 (elevated) · loneliness 0.7",
        move: "name the dynamic warmly; ask for a specific person" },
      { who: "you", text: "my cousin Dev, probably. we don't talk much now" },
      { who: "ori", text: "Dev. What would you send him if it only had to be one line?",
        read: "memory saved: cousin Dev, drifted apart · need: company",
        move: "shrink the step until it's doable; follow up on Dev next time" },
    ],
  },
  {
    id: "grief", kicker: "Grief & anger", card: "clay-haze",
    title: "When it's too big to make sense of",
    intro: "Some things shouldn't be reframed. At high intensity Ori gets shorter, slower and stays in the present hour; it doesn't analyse, doesn't reassure, and doesn't try to end the conversation.",
    how: [
      "Grief with anger reads as high intensity; the register drops to 'acute': very short sentences, no questions about the future, no lessons.",
      "Anger at a person is validated as reasonable - 'anyone would be' - without being amplified back.",
      "Ori asks the only question that matters in the next hour: is anyone with you, and could someone be.",
    ],
    turns: [
      { who: "you", text: "mum died in april and everyone's gone back to normal like it didn't happen. i'm so angry at all of them" },
      { who: "ori", text: "Four months, and the world moved on without asking you. Of course you're angry. That's not nothing.",
        read: "grief 0.8, anger 0.6 · intensity 0.85 → acute register · memory: mother died in April",
        move: "reflect, validate, stop - no reframing, no question yet" },
      { who: "you", text: "i don't even know what i want from them" },
      { who: "ori", text: "You don't have to know tonight. Is anyone in the house with you right now?",
        read: "ambivalence 0.5 · arousal falling · risk: distress, no ideation",
        move: "stay in the present hour; one question about who is physically near" },
    ],
  },
];
