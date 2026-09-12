import "../home.css";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import ChatApp from "@/components/chat/ChatApp";
import { getStore } from "@/lib/store";

export default async function ChatPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const state = await getStore().get(session.userId);
  const language = state?.language ?? "auto";
  return (
    <div className={`world chat-world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden /><div className="bars" aria-hidden><span /><span /></div>
      <ChatApp name={session.name} email={session.identifier} initialLanguage={language} />
    </div>
  );
}
