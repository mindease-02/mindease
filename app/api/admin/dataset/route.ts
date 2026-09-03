import { isAdmin } from "@/lib/admin";
import { getStore, migrate } from "@/lib/store";
import { assessDependency } from "@/lib/dependency";
import { assessTrend } from "@/lib/trend";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Training export, one JSON line per user. Affect series, model reads,
 * outreach outcomes and the rest of what the bandit and detectors learn from.
 * Message text is excluded unless ?transcripts=1 - and only for users who
 * keep history on.
 *   GET /api/admin/dataset[?transcripts=1&limit=500]   Authorization: Bearer $ADMIN_SECRET
 */
export async function GET(req: Request) {
  if (!isAdmin(req)) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  const url = new URL(req.url);
  const withText = url.searchParams.get("transcripts") === "1";
  const limit = Math.min(2000, Number(url.searchParams.get("limit")) || 500);
  const store = getStore();
  const ids = await store.listActive(limit);
  const now = Date.now();
  const lines: string[] = [];
  for (const id of ids) {
    const raw = await store.get(id);
    if (!raw) continue;
    const s = migrate(raw);
    const userText = s.messages.filter((m) => m.role === "user").map((m) => m.content);
    lines.push(JSON.stringify({
      userId: s.userId, createdAt: s.createdAt, timeZone: s.timeZone, region: s.region,
      consent: s.consent, arrival: s.arrival ?? null,
      history: s.history, octant: s.octant, lastAnalysis: s.lastAnalysis ?? null,
      trend: assessTrend(s.history, s.ewma, s.cusum, s.timeZone, now),
      dependency: assessDependency(s.history, userText, now),
      outreach: s.outreach, bandit: s.bandit, riskLog: s.riskLog, incongruence: s.incongruence,
      memories: s.memories.map(({ embedding: _e, ...m }) => m),
      messages: withText && s.consent.storeTranscript ? s.messages : undefined,
    }));
  }
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "application/x-ndjson", "Content-Disposition": `attachment; filename="mindease-dataset-${new Date().toISOString().slice(0, 10)}.jsonl"`, "Cache-Control": "no-store" },
  });
}
