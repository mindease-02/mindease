"use client";
import { useEffect } from "react";

/** Registers the service worker so the help numbers open with no connection. Silent when unsupported. */
export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
