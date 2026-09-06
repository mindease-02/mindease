import { NextResponse } from "next/server";
import { runTurn, RateLimitError } from "@/lib/pipeline/turn";
import { getCompanionStore } from "@/lib/companion/store";
import { companionBlock, FORBIDDEN_PHRASES } from "@/lib/companion/prompt";
import { extractMemories } from "@/lib/memory/extract";
import { getStore, migrate } from "@/lib/store";
import { isResponse, withCompanion } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One companion turn, streamed.
 *
 * Wire format: newline-delimited JSON. `{"d":"..."}` lines carry text deltas as
 * the model produces them; the last line is `{"done":{...}}` with the same
 * TurnResult the main chat gets (risk, helplines, analysis), minus nothing. On
 * a hard error before any text is sent, a normal JSON error response is
 * returned instead.
 */
export async function POST(req: Request) {
  const c = await withCompanion();
  if (isResponse(c)) return c;
  const { session, profile } = c;
  const body = (await req.json().catch(() => null)) as null | { text?: string; timeZone?: string; region?: string; clientContext?: { role: "user" | "assistant"; content: string }[] };
  const text = body?.text?.trim() ?? "";
  if (!text) return NextResponse.json({ error: "empty message" }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "that's a lot at once - try a shorter message" }, { status: 400 });

  const cs = getCompanionStore();
  const memories = profile.privacy.remember ? await cs.listMemories(session.userId, profile.id) : [];
  const history = profile.privacy.storeHistory ? await cs.listMessages(session.userId, profile.id, 16) : [];
  const clientContext = (history.length ? history.map((m) => ({ role: m.role, content: m.content })) : body?.clientContext ?? []).slice(-16);
  const block = companionBlock(profile, session.name, memories);

  // Keep the shared state's companion flag fresh (check-ins follow it).
  try {
    const s = getStore(); const raw = await s.get(session.userId);
    if (raw && (!raw.companionMode?.active || raw.companionMode.companionId !== profile.id)) { const st = migrate(raw); st.companionMode = { active: true, companionId: profile.id, name: profile.name, since: Date.now() }; await s.put(st); }
  } catch { /* non-fatal */ }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await runTurn({
          userId: session.userId, displayName: session.name, text,
          timeZone: body?.timeZone, region: body?.region, clientContext,
          companion: { name: profile.name, block, onToken: (d) => send({ d }) },
        });
        // Belt and braces: a companion reply must never carry an exclusivity line.
        const lower = result.reply.toLowerCase();
        if (FORBIDDEN_PHRASES.some((p) => lower.includes(p))) {
          result.reply = "I'm glad you're talking to me, and I'd be a poor friend if I let it stop there. Who else could hear some of this today?";
          send({ replace: result.reply });
        }
        // Persist transcript + memories to the companion tables.
        const now = Date.now();
        if (profile.privacy.storeHistory) {
          await cs.addMessages(session.userId, profile.id, [
            { role: "user", content: text, createdAt: result.at - 1 },
            { role: "assistant", content: result.reply, createdAt: result.at },
          ]);
        }
        let newMemories: { id: string; text: string }[] = [];
        if (profile.privacy.remember) {
          const extracted = await extractMemories(text, now);
          const added = await cs.addMemories(session.userId, profile.id, extracted.map((m) => ({ memory: m.text, kind: m.kind, importance: m.importance })));
          newMemories = added.map((m) => ({ id: m.id, text: m.memory }));
        }
        send({ done: { ...result, newMemories, memoriesUsed: memories.slice(0, 12).map((m) => ({ id: m.id, text: m.memory })) } });
      } catch (err) {
        if (err instanceof RateLimitError) send({ error: err.message, retryAfter: Math.ceil(err.retryAfterMs / 1000) });
        else { console.error("[api/companion/chat]", err); send({ error: (err as Error).message || "something went wrong" }); }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
