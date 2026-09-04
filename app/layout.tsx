import type { Metadata, Viewport } from "next";
import "./globals.css";
import { body, display } from "@/components/home/fonts";

export const metadata: Metadata = {
  title: "MindEase - Ori, a companion that notices",
  description: "A companion that notices when you're drifting down, says so honestly, and works to need you less over time. Not therapy. Not a replacement for people.",
};
export const viewport: Viewport = { themeColor: "#07080b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`min-h-full ${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
