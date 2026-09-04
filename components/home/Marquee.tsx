/** A pixel ticker between sections. Pure CSS, duplicated for a seamless loop, paused on hover and under reduced motion. */
export default function Marquee({ items }: { items: string[] }) {
  const row = items.map((t, i) => <span key={i}>{t}<i aria-hidden /></span>);
  return (
    <div className="marquee" aria-label={items.join(", ")}>
      <div className="marquee-track"><div>{row}</div><div aria-hidden>{row}</div></div>
    </div>
  );
}
