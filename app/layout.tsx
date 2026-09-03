import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindEase - Ori, a companion that notices",
  description: "A companion that notices when you're drifting down, says so honestly, and works to need you less over time. Not therapy. Not a replacement for people.",
};
export const viewport: Viewport = { themeColor: "#efe6dc", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
