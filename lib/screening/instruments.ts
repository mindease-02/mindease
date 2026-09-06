/**
 * Validated screening instruments, verbatim where licensing allows (PHQ-9 and
 * GAD-7 are free to use; ISI items paraphrased). These SCREEN - they do not
 * diagnose. Scores put a person in a range that clinicians use to decide who
 * needs a proper assessment; that is exactly how MindEase presents them.
 */
export type InstrumentId = "phq9" | "gad7" | "isi";

export interface Instrument {
  id: InstrumentId;
  name: string;
  domain: string;
  intro: string;
  stem: string;
  items: string[];
  options: { label: string; value: number }[];
  /** Ascending thresholds → band labels. */
  bands: { min: number; label: string; plain: string }[];
  /** Index of the item that must route to the crisis protocol when > 0. */
  crisisItem?: number;
  max: number;
}

const FREQ = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  phq9: {
    id: "phq9", name: "PHQ-9", domain: "low mood",
    intro: "Doctors use a short set of nine questions to get a sense of low mood. Want to go through them with me? It takes two minutes, and I'll tell you honestly what the answers add up to.",
    stem: "Over the last two weeks, how often have you been bothered by",
    items: [
      "little interest or pleasure in doing things?",
      "feeling down, depressed, or hopeless?",
      "trouble falling or staying asleep, or sleeping too much?",
      "feeling tired or having little energy?",
      "poor appetite or overeating?",
      "feeling bad about yourself - or that you are a failure or have let yourself or your family down?",
      "trouble concentrating on things, such as reading or watching television?",
      "moving or speaking so slowly that other people could have noticed? Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual?",
      "thoughts that you would be better off dead, or of hurting yourself in some way?",
    ],
    options: FREQ, crisisItem: 8, max: 27,
    bands: [
      { min: 0, label: "minimal", plain: "in the minimal range" },
      { min: 5, label: "mild", plain: "in the mild range" },
      { min: 10, label: "moderate", plain: "in the moderate range - the point where doctors usually want to take a proper look" },
      { min: 15, label: "moderately severe", plain: "in the moderately severe range - worth seeing someone about soon" },
      { min: 20, label: "severe", plain: "in the severe range - please see someone this week" },
    ],
  },
  gad7: {
    id: "gad7", name: "GAD-7", domain: "anxiety",
    intro: "There's a short seven-question check that doctors use for anxiety. Want to do it with me? Two minutes, and I'll say plainly what it shows.",
    stem: "Over the last two weeks, how often have you been bothered by",
    items: [
      "feeling nervous, anxious, or on edge?",
      "not being able to stop or control worrying?",
      "worrying too much about different things?",
      "trouble relaxing?",
      "being so restless that it's hard to sit still?",
      "becoming easily annoyed or irritable?",
      "feeling afraid as if something awful might happen?",
    ],
    options: FREQ, max: 21,
    bands: [
      { min: 0, label: "minimal", plain: "in the minimal range" },
      { min: 5, label: "mild", plain: "in the mild range" },
      { min: 10, label: "moderate", plain: "in the moderate range - the point where doctors usually want to take a proper look" },
      { min: 15, label: "severe", plain: "in the severe range - worth seeing someone about soon" },
    ],
  },
  isi: {
    id: "isi", name: "ISI", domain: "sleep",
    intro: "Your nights have been coming up a lot. There's a seven-question sleep check clinicians use - want to run through it? I'll tell you what it adds up to.",
    stem: "Over the last two weeks,",
    items: [
      "how hard has it been to fall asleep?",
      "how hard has it been to stay asleep?",
      "how much of a problem has waking too early been?",
      "how satisfied are you with your sleep overall? (0 = very satisfied, 3 = very unhappy with it)",
      "how much does the sleep problem interfere with your day - mood, energy, concentration, work?",
      "how noticeable do you think your sleep problem is to others?",
      "how worried are you about your sleep?",
    ],
    options: [
      { label: "Not at all", value: 0 }, { label: "A little", value: 1 }, { label: "Quite a bit", value: 2 }, { label: "Very much", value: 3 },
    ],
    max: 21,
    bands: [
      { min: 0, label: "no clinically significant insomnia", plain: "not in a range that usually needs treatment" },
      { min: 8, label: "subthreshold", plain: "in the mild range - worth watching" },
      { min: 15, label: "moderate", plain: "in the moderate range - worth raising with a doctor" },
      { min: 22, label: "severe", plain: "in the severe range - please see someone about it" },
    ],
  },
};

export function bandFor(inst: Instrument, score: number) {
  let b = inst.bands[0];
  for (const x of inst.bands) if (score >= x.min) b = x;
  return b;
}
