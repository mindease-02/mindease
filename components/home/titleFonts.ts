import { Instrument_Serif, Inter } from "next/font/google";

/** Type for the opening card only: a refined serif for the names, a quiet sans for the eyebrow. */
export const titleSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-title", display: "swap" });
export const titleSans = Inter({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-title-sans", display: "swap" });
