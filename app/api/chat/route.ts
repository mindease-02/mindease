import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { runTurn } from "@/lib/pipeline/turn";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as null | {
    text?: string; timeZone?: string; region?: string;
    prosody?: Parameters<typeof runTurn>[0]["prosody"];
    typing?: Parameters<typeof runTurn>[0]["typing"];
    clientContext?: { role: "user" | "assistant"; content: string }[];
  };
  const text = body?.text?.trim() ?? "";
  if (!text) return NextResponse.json({ error: "empty message" }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "that's a lot at once - try a shorter message" }, { status: 400 });

  try {
    const result = await runTurn({
      userId: session.userId, displayName: session.name, text,
      timeZone: body?.timeZone, region: body?.region, prosody: body?.prosody, typing: body?.typing,
      clientContext: body?.clientContext,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/chat]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
