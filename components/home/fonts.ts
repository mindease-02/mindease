import { Pixelify_Sans, Press_Start_2P, Silkscreen } from "next/font/google";

/**
 * Pixel type system.
 *  - Press Start 2P: the logo and hero words - true 8-bit bitmap look, used big.
 *  - Silkscreen: headings, buttons, labels - a pixel face that stays readable at 14-32px.
 *  - Pixelify Sans: body and chat - pixel construction but with real x-height, so
 *    long messages remain comfortable to read.
 */
export const display = Press_Start_2P({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
export const heading = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-heading", display: "swap" });
export const body = Pixelify_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
