import { Fraunces, Manrope } from "next/font/google";

/**
 * Type system.
 *  - Fraunces: display - headlines, chapter words, the wordmark. A soft, warm serif
 *    with optical sizing, used big and light.
 *  - Manrope: headings, UI and body - one quiet geometric sans for everything that has to be read.
 */
export const display = Fraunces({ subsets: ["latin"], weight: "variable", style: ["normal", "italic"], axes: ["opsz", "SOFT"], variable: "--font-display", display: "swap" });
export const heading = Manrope({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-heading", display: "swap" });
export const body = Manrope({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });
