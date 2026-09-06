import { NextResponse } from "next/server";
import { currentSession, type Session } from "@/lib/auth";
import { getCompanionStore } from "@/lib/companion/store";
import type { CompanionProfile } from "@/lib/companion/types";

/** Session + profile, or the right error response. */
export async function withCompanion(): Promise<{ session: Session; profile: CompanionProfile } | NextResponse> {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const profile = await getCompanionStore().getProfile(session.userId);
  if (!profile) return NextResponse.json({ error: "no companion yet" }, { status: 404 });
  return { session, profile };
}

export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse;
