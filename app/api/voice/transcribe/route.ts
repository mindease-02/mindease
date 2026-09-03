import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { transcribe } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "no audio" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "recording too long" }, { status: 413 });
  try {
    const name = (file as File).name || "audio.webm";
    const text = await transcribe(file, name);
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
