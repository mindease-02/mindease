import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { getCompanionStore } from "@/lib/companion/store";
import { voiceConfigured } from "@/lib/companion/voice";
import CompanionSetup from "@/components/companion/CompanionSetup";
import CompanionShell from "../_shell";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/login");
  const { edit } = await searchParams;
  const profile = await getCompanionStore().getProfile(session.userId);
  if (profile && edit !== "1") redirect("/companion");
  return <CompanionShell><CompanionSetup initial={profile} displayName={session.name} voiceProvider={voiceConfigured()} edit={!!profile} /></CompanionShell>;
}
