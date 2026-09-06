/**
 * The opening card of the landing page: a full-viewport title in the same
 * oversized pixel type as the scroll story, letters arriving one by one.
 */
const LINES: { text: string; className: string }[] = [
  { text: "PARNEETH", className: "tc-line" },
  { text: "X", className: "tc-line tc-x" },
  { text: "RISHI", className: "tc-line" },
];

export default function TitleCard() {
  let n = 0;
  return (
    <section className="title-card" aria-label="Parneeth x Rishi">
      <h1 className="display tc-title">
        {LINES.map((l) => (
          <span key={l.text} className={l.className}>
            {l.text.split("").map((ch, i) => (
              <span key={i} className="ch" style={{ ["--i" as string]: n++ }}>{ch}</span>
            ))}
          </span>
        ))}
      </h1>
      <div className="tc-hint" aria-hidden><span /></div>
    </section>
  );
}
