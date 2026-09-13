import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import type { UserState } from "@/lib/store/types";

/** Loads the signed-in person's state, runs a change, saves it. The handler returns the JSON body or a Response. */
export async function withState<B>(req: Request, fn: (state: UserState, body: B) => Promise<Record<string, unknown> | Response> | Record<string, unknown> | Response): Promise<Response> {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as B;
  const store = getStore();
  const raw = await store.get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  const out = await fn(state, body);
  if (out instanceof Response) return out;
  await store.put(state);
  return NextResponse.json(out);
}
