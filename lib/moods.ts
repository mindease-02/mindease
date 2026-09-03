/** Arrival moods. Plain module so both the client picker and the API route can import it. */
/** Colours are the emotion palettes' assigned colours (lib/theme.ts), so the
 *  tile, the ball and the site all agree on what a feeling looks like. */
export const MOODS = [
  { id: "heavy", label: "Heavy", hint: "low, flat, hard to move", c: "#3fa7d6" },
  { id: "anxious", label: "Anxious", hint: "wired, braced, can't settle", c: "#9b6bff" },
  { id: "lonely", label: "Lonely", hint: "nobody to tell", c: "#7fd0e0" },
  { id: "numb", label: "Numb", hint: "not much of anything", c: "#8b8f99" },
  { id: "angry", label: "Angry", hint: "at someone, or everything", c: "#e0332e" },
  { id: "restless", label: "Restless", hint: "need to do something, unsure what", c: "#e2a63a" },
  { id: "okay", label: "Okay", hint: "fine, actually — just here", c: "#f0876a" },
  { id: "hopeful", label: "Hopeful", hint: "something's lifting", c: "#4fb37f" },
] as const;
export type MoodId = (typeof MOODS)[number]["id"];
