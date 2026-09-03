import Link from "next/link";
import { redirect } from "next/navigation";
import Orb from "@/components/Orb";
import LoginForm from "@/components/LoginForm";
import { currentSession } from "@/lib/auth";

export default async function LoginPage() {
  if (await currentSession()) redirect("/chat");
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="fog animate-drift" />
      <Link href="/" className="relative mb-8 flex items-center gap-3">
        <Orb size={44} />
        <span className="font-serif text-2xl tracking-tight">MindEase</span>
      </Link>
      <div className="relative w-full max-w-md"><LoginForm /></div>
    </main>
  );
}
