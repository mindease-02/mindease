import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import ChatApp from "@/components/chat/ChatApp";

export default async function ChatPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  return <ChatApp name={session.name} />;
}
