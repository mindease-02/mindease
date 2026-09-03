"use client";
import { useEffect } from "react";
import { applyPalette, currentPalette } from "@/lib/theme";

/** Re-applies the persisted palette on every world page before first paint settles. */
export default function ThemeInit() {
  useEffect(() => { applyPalette(currentPalette(), false); }, []);
  return null;
}
