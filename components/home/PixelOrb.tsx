/**
 * An 8-bit ball drawn with box-shadow pixels: a 10x10 sprite with a highlight,
 * a mid tone and a shadow, coloured from the current palette. Used for the
 * logo, the chat header, mood dots and the no-WebGL fallbacks.
 */
const SPRITE = [
  "...HHHH...",
  ".HHLLLLHH.",
  "HLLWWLLLMH",
  "HLWWLLLLMH",
  "HLLLLLLMMH",
  "HLLLLLMMMH",
  "HLLLLMMMDH",
  "HMLMMMMDDH",
  ".HMMMDDDH.",
  "...HHHH...",
];
const TONES: Record<string, string> = { H: "var(--px-edge)", L: "var(--coral-2)", W: "#fff7f0", M: "var(--accent-mid)", D: "var(--accent-deep)" };

export default function PixelOrb({ size = 32, className = "", color }: { size?: number; className?: string; color?: string }) {
  const px = size / 10;
  const shadows: string[] = [];
  SPRITE.forEach((row, y) => [...row].forEach((c, x) => { if (c !== ".") shadows.push(`${x * px}px ${y * px}px 0 0 ${TONES[c]}`); }));
  return (
    <span className={`pxorb ${className}`} aria-hidden style={{ width: size, height: size, ...(color ? { ["--coral-2" as string]: color, ["--accent-mid" as string]: color, ["--accent-deep" as string]: color } : {}) }}>
      <i style={{ width: px, height: px, boxShadow: shadows.join(",") }} />
    </span>
  );
}
