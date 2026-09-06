import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { getCompanionStore } from "@/lib/companion/store";
import CompanionHome from "@/components/companion/CompanionHome";
import CompanionShell from "./_shell";

export const dynamic = "force-dynamic";

export default async function CompanionPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const profile = await getCompanionStore().getProfile(session.userId);
  if (!profile) redirect("/companion/setup");
  return <CompanionShell><CompanionHome profile={profile} /></CompanionShell>;
}
