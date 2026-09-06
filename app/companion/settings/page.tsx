import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { getCompanionStore } from "@/lib/companion/store";
import { voiceConfigured } from "@/lib/companion/voice";
import CompanionSettingsPage from "@/components/companion/CompanionSettingsPage";
import CompanionShell from "../_shell";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const store = getCompanionStore();
  const profile = await store.getProfile(session.userId);
  if (!profile) redirect("/companion/setup");
  const memories = await store.listMemories(session.userId, profile.id);
  return <CompanionShell><CompanionSettingsPage profile={profile} displayName={session.name} voiceProvider={voiceConfigured()} memoryCount={memories.length} /></CompanionShell>;
}
