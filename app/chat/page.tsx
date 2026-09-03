import "../home.css";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import ChatApp from "@/components/chat/ChatApp";

export default async function ChatPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  return (
    <div className={`world chat-world ${display.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden /><div className="bars" aria-hidden><span /><span /></div>
      <ChatApp name={session.name} />
    </div>
  );
}
