import type { Config } from "tailwindcss";

/**
 * Palette: the warmth of Her (peach, coral, soft amber) sitting inside the
 * atmosphere of Blade Runner 2049 (dust, haze, deep slate, a single cold cyan).
 * Claymorphism wants low-saturation pastels with strong tonal shadows, so every
 * surface colour has a matching darker "shade" used for the extruded edge.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#efe6dc",
          "bg-deep": "#e4d8cb",
          surface: "#f6efe7",
          ink: "#2b2622",
          muted: "#7d7168",
          line: "#d9cdbf",
          peach: "#f4c6ad",
          "peach-shade": "#d9a284",
          coral: "#e8917a",
          "coral-shade": "#c36f5b",
          amber: "#e9b96a",
          "amber-shade": "#c4934a",
          sage: "#b9c7b3",
          "sage-shade": "#93a48c",
          haze: "#c9d2d6",
          "haze-shade": "#9fabb2",
          slate: "#3a3f47",
          "slate-deep": "#22262c",
          cyan: "#7ec8d8",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "-apple-system", "Inter", "Segoe UI", "Helvetica Neue", "sans-serif"],
        serif: ["Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
      },
      boxShadow: {
        clay: "8px 8px 18px rgba(89, 70, 55, 0.18), -6px -6px 14px rgba(255, 255, 255, 0.75), inset 2px 2px 4px rgba(255,255,255,0.6), inset -3px -3px 6px rgba(89,70,55,0.10)",
        "clay-sm": "4px 4px 10px rgba(89, 70, 55, 0.16), -3px -3px 8px rgba(255, 255, 255, 0.7), inset 1px 1px 2px rgba(255,255,255,0.55), inset -2px -2px 4px rgba(89,70,55,0.08)",
        "clay-in": "inset 5px 5px 10px rgba(89, 70, 55, 0.16), inset -4px -4px 9px rgba(255, 255, 255, 0.7)",
        "clay-dark": "8px 8px 18px rgba(0,0,0,0.35), -4px -4px 12px rgba(255,255,255,0.05), inset 2px 2px 4px rgba(255,255,255,0.08), inset -3px -3px 6px rgba(0,0,0,0.35)",
      },
      borderRadius: { clay: "28px", "clay-lg": "40px" },
      keyframes: {
        breathe: { "0%,100%": { transform: "scale(1)", opacity: "0.85" }, "50%": { transform: "scale(1.06)", opacity: "1" } },
        drift: { "0%": { transform: "translate3d(0,0,0)" }, "100%": { transform: "translate3d(-4%, 3%, 0)" } },
        rise: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite",
        drift: "drift 40s ease-in-out infinite alternate",
        rise: "rise .35s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
