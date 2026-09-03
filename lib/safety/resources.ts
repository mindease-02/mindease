/**
 * Crisis resources.
 *
 * Hard-coded, never generated. A hallucinated phone number in this position is
 * the single worst thing this application could produce, so the model is never
 * asked to supply one - the UI renders these strings directly, and the system
 * prompt tells the model to defer to the card rather than recite numbers itself.
 *
 * findahelpline.com is the fallback for every region: it is maintained, covers
 * ~130 countries, and is far more likely to be current than a list embedded in an
 * app someone deployed once. Verify these before shipping to real users - numbers
 * do change, and this list was written on 2026-09-04.
 */

export interface Helpline {
  region: string;
  name: string;
  contact: string;
  note?: string;
  url?: string;
}

export const HELPLINES: Helpline[] = [
  { region: "US", name: "988 Suicide & Crisis Lifeline", contact: "Call or text 988", url: "https://988lifeline.org", note: "24/7" },
  { region: "US", name: "Crisis Text Line", contact: "Text HOME to 741741", url: "https://www.crisistextline.org" },
  { region: "GB", name: "Samaritans", contact: "Call 116 123", url: "https://www.samaritans.org", note: "24/7, free" },
  { region: "GB", name: "Shout", contact: "Text SHOUT to 85258", url: "https://giveusashout.org" },
  { region: "IE", name: "Samaritans Ireland", contact: "Call 116 123", url: "https://www.samaritans.org/ireland" },
  { region: "IN", name: "Tele-MANAS", contact: "Call 14416 or 1-800-891-4416", url: "https://telemanas.mohfw.gov.in", note: "24/7, multiple languages" },
  { region: "IN", name: "AASRA", contact: "Call +91 9820466726", url: "http://www.aasra.info", note: "24/7" },
  { region: "AU", name: "Lifeline Australia", contact: "Call 13 11 14", url: "https://www.lifeline.org.au" },
  { region: "CA", name: "9-8-8 Suicide Crisis Helpline", contact: "Call or text 988", url: "https://988.ca" },
  { region: "NZ", name: "1737 Need to talk?", contact: "Call or text 1737", url: "https://1737.org.nz" },
  { region: "DE", name: "Telefonseelsorge", contact: "Call 0800 111 0 111", url: "https://www.telefonseelsorge.de" },
  { region: "FR", name: "3114", contact: "Call 3114", url: "https://3114.fr" },
  { region: "ZA", name: "SADAG", contact: "Call 0800 567 567", url: "https://www.sadag.org" },
  { region: "*", name: "Find a Helpline", contact: "findahelpline.com", url: "https://findahelpline.com", note: "Free, confidential lines in ~130 countries" },
];

export const EMERGENCY_NUMBERS: Record<string, string> = {
  US: "911", CA: "911", GB: "999", IE: "112", IN: "112", AU: "000",
  NZ: "111", DE: "112", FR: "112", ZA: "10111", EU: "112",
};

export function helplinesFor(region?: string): Helpline[] {
  const code = (region ?? "").toUpperCase();
  const local = HELPLINES.filter((h) => h.region === code);
  const global = HELPLINES.filter((h) => h.region === "*");
  return [...local, ...global];
}

export function emergencyFor(region?: string): string {
  return EMERGENCY_NUMBERS[(region ?? "").toUpperCase()] ?? "your local emergency number";
}

/**
 * The line the system uses when it declines to be someone's only support. Written
 * out here rather than left to the model so it stays consistent, and so it can be
 * reviewed as copy by someone who knows what they are doing.
 */
export const ROLE_LIMIT_STATEMENT =
  "I want to be straight with you about what I am. I'm software. I don't remember you " +
  "the way a person does, I'm not going to notice if you stop showing up unless I'm " +
  "running, and I can't sit with you in a room. I can be useful between the times you " +
  "talk to people who can do those things - but I'd be doing you harm if I let myself " +
  "become the main one.";
