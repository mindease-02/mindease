"use client";
import { useEffect } from "react";
import { enterPage } from "@/lib/motion";

/** Entry pages settle in with Anime: a slow push-in from slightly larger, plus fade. */
export default function PageEnter({ selector = ".shot > *" }: { selector?: string }) {
  useEffect(() => { document.querySelectorAll<HTMLElement>(selector).forEach((el) => enterPage(el)); }, [selector]);
  return null;
}
