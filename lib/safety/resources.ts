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
 * app someone deployed once.
 *
 * Indian entries were verified on 2026-09-14 against each operator's own site or a
 * government source (telemanas.mohfw.gov.in, PIB, dosje.gov.in, missionshakti.wcd.gov.in,
 * ncw.gov.in, wcd.gov.in, cybercrime.gov.in, mha.gov.in, and the NGOs' own pages).
 * KIRAN (1800-599-0019) was merged into Tele-MANAS and phased out in 2024; do not re-add it.
 * Numbers were confirmed as published, not dial-tested. Re-verify every few months.
 */

export interface Helpline {
  region: string;
  name: string;
  contact: string;
  note?: string;
  url?: string;
  /** Opening hours in the line's local time, 24h decimal. Absent means all hours, every day. */
  hours?: { from: number; to: number; days?: "mon-sat" | "mon-fri"; timeZone: string };
}

export const HELPLINES: Helpline[] = [
  { region: "US", name: "988 Suicide & Crisis Lifeline", contact: "Call or text 988", url: "https://988lifeline.org", note: "24/7" },
  { region: "US", name: "Crisis Text Line", contact: "Text HOME to 741741", url: "https://www.crisistextline.org" },
  { region: "GB", name: "Samaritans", contact: "Call 116 123", url: "https://www.samaritans.org", note: "24/7, free" },
  { region: "GB", name: "Shout", contact: "Text SHOUT to 85258", url: "https://giveusashout.org" },
  { region: "IE", name: "Samaritans Ireland", contact: "Call 116 123", url: "https://www.samaritans.org/ireland" },
  { region: "IN", name: "Tele-MANAS (Govt. of India)", contact: "Call 14416 or 1800-891-4416", url: "https://telemanas.mohfw.gov.in", note: "24/7, free, 20 Indian languages" },
  { region: "IN", name: "Vandrevala Foundation", contact: "Call or WhatsApp +91 9999 666 555", url: "https://www.vandrevalafoundation.com", note: "24/7" },
  { region: "IN", name: "1Life", contact: "Call +91 78930 78930", url: "https://1life.org.in", note: "24/7, 12 Indian languages" },
  { region: "IN", name: "AASRA", contact: "Call +91 22 2754 6669", url: "https://www.aasra.info", note: "24 hours" },
  { region: "IN", name: "Hitguj helpline (KEM Hospital, Mumbai)", contact: "Call 022 2413 1212", url: "https://www.kem.edu/public/psychiatry", note: "24/7" },
  { region: "IN", name: "iCall (TISS)", contact: "Call +91 91529 87821", url: "https://icallhelpline.org", note: "Mon-Sat, 8am-9pm", hours: { from: 8, to: 21, days: "mon-sat", timeZone: "Asia/Kolkata" } },
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

/**
 * "Find someone near you": a map search the browser resolves with the device's
 * own location. Nothing about the person leaves this app to make it work.
 */
export const NEARBY_HELP_URL = "https://www.google.com/maps/search/psychologist+or+counsellor+near+me";

/**
 * Support for specific situations, shown under "Help for a specific situation".
 * Only services verified against their official sources are listed; see the
 * verification note at the top of this file.
 */
export interface Situation { region: string; situationKey: string; name: string; contact: string; href: string; note?: string; hours?: Helpline["hours"] }
export const SITUATIONS: Situation[] = [
  { region: "IN", situationKey: "sitCaste", name: "National Helpline Against Atrocities", contact: "14566", href: "tel:14566", note: "24/7" },
  { region: "IN", situationKey: "sitWomen", name: "Women Helpline", contact: "181", href: "tel:181", note: "24/7" },
  { region: "IN", situationKey: "sitWomen", name: "National Commission for Women", contact: "14490", href: "tel:14490", note: "24/7" },
  { region: "IN", situationKey: "sitChild", name: "Child Helpline", contact: "1098", href: "tel:1098", note: "24/7; 112 if in danger now" },
  { region: "IN", situationKey: "sitCyber", name: "National Cyber Crime Helpline", contact: "1930", href: "tel:1930", note: "24/7" },
  { region: "IN", situationKey: "sitQueer", name: "Sappho for Equality, Kolkata", contact: "+91 98315 18320", href: "tel:+919831518320", note: "10am-6pm, closed some days", hours: { from: 10, to: 18, timeZone: "Asia/Kolkata" } },
  { region: "IN", situationKey: "sitSexual", name: "Jagori, Delhi", contact: "+91 88009 96640", href: "tel:+918800996640", note: "Mon-Fri, 9:30am-5:30pm", hours: { from: 9.5, to: 17.5, days: "mon-fri", timeZone: "Asia/Kolkata" } },
];

/**
 * A verified line in the person's own language, when one exists. Shown after the national lines.
 * Hours are limited for most; the note says so.
 */
export const LANGUAGE_LINES: Record<string, Helpline> = {
  ta: { region: "IN", name: "Sneha, Chennai", contact: "Call +91 44 2464 0050", url: "https://snehaindia.org", note: "24 hours, Tamil and English" },
  ml: { region: "IN", name: "Maithri, Kochi", contact: "Call +91 484 254 0530", url: "https://maithrikochi.in", note: "10am-7pm", hours: { from: 10, to: 19, timeZone: "Asia/Kolkata" } },
  te: { region: "IN", name: "Roshni, Hyderabad", contact: "Call +91 81420 20033", url: "https://roshinitrust.com", note: "11am-9pm, Telugu, Hindi, English", hours: { from: 11, to: 21, timeZone: "Asia/Kolkata" } },
  hi: { region: "IN", name: "Sumaitri, Delhi", contact: "Call +91 11 4601 8404", url: "https://www.sumaitri.net", note: "12:30-5pm", hours: { from: 12.5, to: 17, timeZone: "Asia/Kolkata" } },
};

/** Default region when none is known. This deployment serves India first. */
export const DEFAULT_REGION = "IN";

export function helplinesFor(region?: string, language?: string): Helpline[] {
  const code = (region || DEFAULT_REGION).toUpperCase();
  const local = HELPLINES.filter((h) => h.region === code);
  const own = code === "IN" && language ? LANGUAGE_LINES[language] : undefined;
  const global = HELPLINES.filter((h) => h.region === "*");
  // Tele-MANAS first, then the line in their language, then the rest.
  return own ? [local[0], own, ...local.slice(1), ...global].filter(Boolean) : [...local, ...global];
}

export function emergencyFor(region?: string): string {
  return EMERGENCY_NUMBERS[(region || DEFAULT_REGION).toUpperCase()] ?? "your local emergency number";
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

/** Every phone number the app itself shows for a region, so the reply guard can allow exactly these. */
export function listedNumbers(region?: string): string[] {
  return [...helplinesFor(region).map((h) => h.contact), emergencyFor(region), ...HELPLINES.filter((h) => h.region === "IN").map((h) => h.contact), ...Object.values(LANGUAGE_LINES).map((h) => h.contact), ...SITUATIONS.map((x) => x.contact)];
}

/**
 * Whether a line answers right now. Lines without hours answer at any time.
 * Returns the next opening time (24h decimal, local to the line) when closed,
 * so the card can say "opens at 8am" instead of sending someone to a dead line.
 */
export function openNow(hours: Helpline["hours"], now = Date.now()): { open: boolean; opensAt?: number } {
  if (!hours) return { open: true };
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: hours.timeZone, hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const h = Number(get("hour")) % 24 + Number(get("minute")) / 60;
  const day = get("weekday");
  const dayOk = hours.days === "mon-fri" ? !["Sat", "Sun"].includes(day) : hours.days === "mon-sat" ? day !== "Sun" : true;
  const open = dayOk && h >= hours.from && h < hours.to;
  return open ? { open } : { open, opensAt: hours.from };
}

/** Helplines with the ones answering right now first; the order inside each group is kept. */
export function sortOpenFirst<T extends { hours?: Helpline["hours"] }>(lines: T[], now = Date.now()): T[] {
  return [...lines.filter((l) => openNow(l.hours, now).open), ...lines.filter((l) => !openNow(l.hours, now).open)];
}
