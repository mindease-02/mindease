/** Arrival moods. Plain module so both the client picker and the API route can import it. */
export const MOODS = [
  { id: "heavy", label: "Heavy", hint: "low, flat, hard to move", c: "#5b6b8a" },
  { id: "anxious", label: "Anxious", hint: "wired, braced, can't settle", c: "#e8b04b" },
  { id: "lonely", label: "Lonely", hint: "nobody to tell", c: "#7fd0e0" },
  { id: "numb", label: "Numb", hint: "not much of anything", c: "#8b8f99" },
  { id: "angry", label: "Angry", hint: "at someone, or everything", c: "#e05a3f" },
  { id: "restless", label: "Restless", hint: "need to do something, unsure what", c: "#c48ae0" },
  { id: "okay", label: "Okay", hint: "fine, actually — just here", c: "#9fb59a" },
  { id: "hopeful", label: "Hopeful", hint: "something's lifting", c: "#f0876a" },
] as const;
export type MoodId = (typeof MOODS)[number]["id"];
