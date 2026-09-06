/**
 * The opening card of the landing page. Two names in a refined serif, a
 * quiet mark between them, warm light behind. Nothing else.
 */
export default function TitleCard() {
  return (
    <section className="title-card" aria-label="Parneeth and Rishi">
      <div className="tc-light" aria-hidden />
      <p className="tc-eyebrow">A collaboration</p>
      <h1 className="tc-title">
        <span className="tc-name" style={{ ["--d" as string]: "0ms" }}>Parneeth</span>
        <span className="tc-mark" style={{ ["--d" as string]: "160ms" }} aria-hidden>×</span>
        <span className="tc-name" style={{ ["--d" as string]: "260ms" }}>Rishi</span>
      </h1>
      <div className="tc-scroll" aria-hidden><span>Scroll</span><i /></div>
    </section>
  );
}
