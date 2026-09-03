import { Instrument_Serif, Manrope } from "next/font/google";

/**
 * Display: Instrument Serif - a high-contrast editorial face whose italic
 * carries the "someone who notices" line. Body/UI: Manrope, geometric but
 * warm, tuned tight at large sizes and open at small ones.
 */
export const display = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-display", display: "swap" });
export const body = Manrope({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-body", display: "swap" });
