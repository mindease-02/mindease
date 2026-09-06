import { Instrument_Serif, Inter } from "next/font/google";

/**
 * Type system.
 *  - Instrument Serif: display - headlines, chapter words, the wordmark. Used big, light, tight.
 *  - Inter: headings, UI and body - one quiet sans for everything that has to be read.
 */
export const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display", display: "swap" });
export const heading = Inter({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-heading", display: "swap" });
export const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });
