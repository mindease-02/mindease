import { Suspense } from "react";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { getCompanionStore } from "@/lib/companion/store";
import { voiceConfigured } from "@/lib/companion/voice";
import CompanionChat from "@/components/companion/CompanionChat";
import CompanionShell from "../_shell";

export const dynamic = "force-dynamic";

export default async function CompanionChatPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const profile = await getCompanionStore().getProfile(session.userId);
  if (!profile) redirect("/companion/setup");
  return <CompanionShell><Suspense><CompanionChat profile={profile} displayName={session.name} voiceProvider={voiceConfigured()} /></Suspense></CompanionShell>;
}
