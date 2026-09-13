import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getStore, migrate } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The human review summary: aggregate counts across people, no message text,
 * no names, no memories. This is how MindEase "improves over time": a person
 * reads this, authors a change, and the change must pass `npm run gate`.
 * Nothing here is applied automatically.
 *   GET /api/admin/review   Authorization: Bearer $ADMIN_SECRET
 */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const store = getStore();
  const ids = await store.listActive(2000);
  const checkins: Record<string, { sent: number; notUseful: number; rewardSum: number; scored: number }> = {};
  const ratings: Record<string, number> = { helped: 0, missed: 0 };
  const missedReasons: Record<string, number> = {};
  const corrections: Record<string, number> = {};
  const guard: Record<string, number> = {};
  const memoryModes: Record<string, number> = {};
  let people = 0;
  for (const id of ids) {
    const raw = await store.get(id);
    if (!raw) continue;
    const s = migrate(raw);
    people++;
    for (const o of s.outreach) {
      const c = (checkins[o.kind] ??= { sent: 0, notUseful: 0, rewardSum: 0, scored: 0 });
      c.sent++; if (o.rejected) c.notUseful++;
      if (typeof o.reward === "number" && o.reward !== 0) { c.rewardSum += o.reward; c.scored++; }
    }
    for (const f of s.replyFeedback ?? []) { ratings[f.verdict] = (ratings[f.verdict] ?? 0) + 1; if (f.reason) missedReasons[f.reason] = (missedReasons[f.reason] ?? 0) + 1; }
    for (const c of s.readCorrections ?? []) { const k = `${c.said} -> ${c.meant}`; corrections[k] = (corrections[k] ?? 0) + 1; }
    for (const [k, v] of Object.entries(s.guardCounts ?? {})) guard[k] = (guard[k] ?? 0) + v;
    const mode = s.consent.memoryMode ?? "ask"; memoryModes[mode] = (memoryModes[mode] ?? 0) + 1;
  }
  const sort = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    people,
    note: "Aggregate counts only. Read, then author any change and run `npm run gate`. Never apply automatically.",
    checkinsByStyle: Object.fromEntries(Object.entries(checkins).map(([k, v]) => [k, { sent: v.sent, notUsefulRate: v.sent ? Number((v.notUseful / v.sent).toFixed(3)) : 0, meanOutcome: v.scored ? Number((v.rewardSum / v.scored).toFixed(3)) : null }])),
    replyRatings: ratings,
    missedReasons: sort(missedReasons),
    readCorrections: sort(corrections),
    guardRewrites: sort(guard),
    memoryModes,
  }, { headers: { "Cache-Control": "no-store" } });
}
