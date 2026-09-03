/** Arrival moods = the eight emotion palettes. One source of truth for colour, label and description. */
import { PALETTES } from "./theme";

export const MOODS = PALETTES.map((p) => ({ id: p.id, label: p.label, hint: p.hint, description: p.description, c: p.accent }));
export type MoodId = (typeof PALETTES)[number]["id"];
