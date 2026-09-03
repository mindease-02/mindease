"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

function b64ToU8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Second-consent push subscription: the Mirror switch calls subscribe(), which triggers the browser prompt. */
export function usePush() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    if (!ok) return;
    fetch("/api/push/key").then((r) => r.json()).then((j) => setEnabled(!!j.enabled)).catch(() => {});
    navigator.serviceWorker.register("/sw.js").then((reg) => reg.pushManager.getSubscription()).then((s) => setSubscribed(!!s)).catch(() => {});
  }, []);

  const subscribe = useCallback(async (): Promise<string | null> => {
    try {
      const { publicKey } = await fetch("/api/push/key").then((r) => r.json());
      if (!publicKey) return "Push isn't configured on the server (VAPID keys).";
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(publicKey) });
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) return "Couldn't save the subscription.";
      setSubscribed(true);
      return null;
    } catch (err) {
      return (err as Error).message || "Notification permission was refused.";
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub?.endpoint }) });
      await sub?.unsubscribe();
    } finally { setSubscribed(false); }
  }, []);

  return useMemo(() => ({ supported, enabled, subscribed, subscribe, unsubscribe }), [supported, enabled, subscribed, subscribe, unsubscribe]);
}
