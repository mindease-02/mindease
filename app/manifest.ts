import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MindEase", short_name: "MindEase",
    description: "A companion that notices when you're drifting down, says so honestly, and works to need you less over time.",
    start_url: "/mood", display: "standalone", orientation: "portrait",
    background_color: "#07080b", theme_color: "#07080b",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
