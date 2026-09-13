import { PxUser, PxStar, PxHourglass, PxRefresh, PxHeart, PxBell, PxSun, PxBrain } from "../home/pixelIcons";

/** One colour and one icon per kind of memory, so a person reads "who" versus "goal" at a glance. */
export const KIND: Record<string, { key: string; color: string; Icon: typeof PxUser }> = {
  person: { key: "stPeople", color: "#7fd0e0", Icon: PxUser },
  goal: { key: "stGoals", color: "#e9b96a", Icon: PxStar },
  past: { key: "stPast", color: "#b9a6e0", Icon: PxHourglass },
  routine: { key: "stRoutine", color: "#8fcf9a", Icon: PxRefresh },
  struggle: { key: "stStruggles", color: "#f0876a", Icon: PxHeart },
  event: { key: "stEvents", color: "#8fb3e8", Icon: PxBell },
  preference: { key: "stPrefs", color: "#e8a0bf", Icon: PxSun },
  fact: { key: "stFacts", color: "#b8b8c2", Icon: PxBrain },
};
export const kindOf = (k: string) => KIND[k] ?? KIND.fact;
