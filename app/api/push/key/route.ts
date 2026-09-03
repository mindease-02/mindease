import { NextResponse } from "next/server";
import { pushEnabled } from "@/lib/push";

export function GET() {
  return NextResponse.json({ enabled: pushEnabled(), publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
