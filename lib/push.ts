/**
 * Web Push for unprompted messages when the tab is closed. Opt-in twice: the
 * Mirror switch, then the browser's own permission prompt. VAPID keys:
 *
 *   npx web-push generate-vapid-keys
 *
 * Dead subscriptions (410/404) are reported back so the caller prunes them.
 */
import webpush from "web-push";
import type { PushSub } from "./store/types";

let configured = false;

export function pushEnabled(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function ensure() {
  if (configured || !pushEnabled()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hello@example.com",
    process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export async function sendPush(subs: PushSub[], payload: { title: string; body: string; url?: string }): Promise<{ sent: number; dead: string[] }> {
  if (!pushEnabled() || !subs.length) return { sent: 0, dead: [] };
  ensure();
  const dead: string[] = [];
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 6 * 3600 });
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) dead.push(s.endpoint);
      else console.warn("[push]", code, (err as Error).message);
    }
  }));
  return { sent, dead };
}
