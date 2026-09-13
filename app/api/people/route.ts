import { withState } from "@/lib/api/withState";

export const runtime = "nodejs";

/** "I talked to someone." A timestamp, nothing about who. Counts toward the outward side of the weekly reflection. */
export async function POST(req: Request) {
  return withState<{ undo?: boolean }>(req, (state, b) => {
    const now = Date.now();
    const list = state.peopleContacts ?? [];
    if (b.undo) state.peopleContacts = list.slice(0, -1);
    else if (!list.some((x) => now - x.at < 30 * 60_000)) state.peopleContacts = [...list, { at: now }].slice(-400);
    return { ok: true, thisWeek: (state.peopleContacts ?? []).filter((x) => now - x.at < 7 * 86_400_000).length };
  });
}
