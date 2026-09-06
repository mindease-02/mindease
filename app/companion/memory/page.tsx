import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { getCompanionStore } from "@/lib/companion/store";
import CompanionMemory from "@/components/companion/CompanionMemory";
import CompanionShell from "../_shell";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const profile = await getCompanionStore().getProfile(session.userId);
  if (!profile) redirect("/companion/setup");
  return <CompanionShell><CompanionMemory name={profile.name} /></CompanionShell>;
}
