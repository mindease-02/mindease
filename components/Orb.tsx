/**
 * MindEase's presence. Deliberately not a face: a soft, breathing form whose tint
 * follows the eight-axis read. Human enough to feel company, non-human enough
 * that nobody mistakes it for a person - the Jellycat register, not the
 * uncanny one.
 */
export interface OrbTint { warm?: number; cool?: number; dim?: number }

export default function Orb({ size = 56, tint, pulse = true, className = "" }: { size?: number; tint?: OrbTint; pulse?: boolean; className?: string }) {
  const warm = tint?.warm ?? 0.5, cool = tint?.cool ?? 0.3, dim = tint?.dim ?? 0;
  const style: React.CSSProperties = {
    width: size, height: size,
    background:
      `radial-gradient(circle at 35% 30%, rgba(255,255,255,.92), rgba(255,255,255,0) 42%),` +
      `radial-gradient(circle at 62% 70%, rgba(126,200,216,${(0.25 + cool * 0.5).toFixed(2)}), rgba(126,200,216,0) 58%),` +
      `linear-gradient(145deg, rgba(244,198,173,${(1 - dim * 0.4).toFixed(2)}), rgba(232,145,122,${(0.7 + warm * 0.3 - dim * 0.3).toFixed(2)}))`,
    filter: dim > 0.5 ? "saturate(.7)" : undefined,
  };
  return <div aria-hidden className={`orb ${pulse ? "animate-breathe" : ""} ${className}`} style={style} />;
}
