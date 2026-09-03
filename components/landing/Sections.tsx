import Link from "next/link";
import AnnotatedChat from "./AnnotatedChat";
import { SCENARIOS } from "./scenarios";

export function Hero({ chatHref = "/login" }: { chatHref?: string }) {
  const s = SCENARIOS[2];
  return (
    <section className="relative overflow-hidden px-6 pb-12 pt-16 sm:pt-24">
      <div className="fog animate-drift" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div className="clay animate-rise p-8 sm:p-10">
          <div className="clay-chip mb-6">not therapy &middot; not a replacement for people &middot; honest about being software</div>
          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-clay-ink sm:text-6xl">
            Someone who <em className="not-italic text-clay-coral">notices.</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-clay-muted">
            Ori is a companion that pays attention to how you're doing - what you say, how you say it, and how that changes across days - and checks in when it matters. It remembers. It's warm. And it's built to need you less over time, not more.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={chatHref} className="clay-btn-primary text-base">Chat with Ori</Link>
            <a href="#how" className="clay-btn">How it decides</a>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[["text + voice + face", "reads words, tone, rhythm, expression"], ["remembers", "your people, plans and past"], ["checks in", "when it matters, never at night"]].map(([t, d]) => (
              <div key={t} className="clay-in p-3">
                <div className="text-xs font-medium">{t}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-clay-muted">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md"><AnnotatedChat title={s.kicker} turns={s.turns} /></div>
        </div>
      </div>
    </section>
  );
}

export function HowItDecides() {
  const steps = [
    { t: "Read", d: "Every message is read for eight emotional axes, nuanced states (loneliness, dread, relief…), how intense it is, and what you seem to need: to vent, to solve, to be distracted, or company. If you allow it, tone of voice, typing rhythm and expression are fused in - each weighed by how sure it is." },
    { t: "Check the gap", d: "What the words show is compared with what the rest suggests. When 'I'm fine' doesn't match a flat voice or a hesitant reply, Ori lowers its confidence and asks - it never overrides you." },
    { t: "Remember", d: "Names, plans, struggles and stories from your past are kept as short facts, retrieved when relevant, and shown to you in full. That's what lets a reply say 'Sam' instead of 'a friend'." },
    { t: "Choose the move", d: "The read picks a register - light, unhurried, slow, or acute - and a move: reflect, one concrete question, validate the feeling but not the conclusion, point outward to a person. Never a list of tips, never two questions at once." },
    { t: "Gate the check-in", d: "Between conversations, four detectors watch the multi-day trend. Two must agree, quiet hours and daily caps must pass, and reliance must not be climbing, before Ori writes first - and it always says what prompted it." },
    { t: "Stay safe", d: "A deterministic crisis filter runs before the model on every message and can't be talked out of it. Real helplines are shown by the app; the model never recites a number." },
  ];
  return (
    <section id="how" className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">How Ori decides what to say</h2>
        <p className="mt-3 max-w-2xl text-clay-muted">The same six steps run on every message. Below, each conversation is annotated with what was read and which move that led to - the same fields you can open in the app's Mirror panel.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.t} className="clay p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-clay-bg-deep font-serif text-lg shadow-clay-in">{i + 1}</div>
              <h3 className="font-medium">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-clay-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <>
      {SCENARIOS.map((s, i) => (
        <section key={s.id} id={s.id} className="px-6 py-10">
          <div className={`mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <div className={`${s.card} p-8 sm:p-10`}>
              <div className="mb-3 inline-block rounded-full bg-clay-surface px-3 py-1 text-xs font-medium shadow-clay-sm">{s.kicker}</div>
              <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">{s.title}</h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-clay-ink/75">{s.intro}</p>
              <h3 className="mt-6 text-[11px] font-medium uppercase tracking-widest text-clay-ink/60">How Ori gets to these answers</h3>
              <ol className="mt-3 space-y-2.5">
                {s.how.map((h, j) => (
                  <li key={j} className="flex gap-3 text-sm leading-relaxed text-clay-ink/80">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay-surface text-xs shadow-clay-sm">{j + 1}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex justify-center"><div className="w-full max-w-md"><AnnotatedChat title={s.kicker} turns={s.turns} /></div></div>
          </div>
        </section>
      ))}
    </>
  );
}

export function Safety() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="clay-dark p-8 sm:p-10">
          <h2 className="font-serif text-2xl sm:text-3xl">What this is not</h2>
          <div className="mt-4 grid gap-6 text-sm leading-relaxed text-clay-haze sm:grid-cols-3">
            <p><strong className="text-clay-surface">Not therapy.</strong> Ori can sit with you between the times you talk to people who can do more. It cannot diagnose, treat, or replace care. It is for adults.</p>
            <p><strong className="text-clay-surface">Not a person.</strong> It doesn't have feelings and won't pretend to. It won't be your partner, and it won't tell you it's waiting for you - it isn't running.</p>
            <p><strong className="text-clay-surface">Not private from you.</strong> Everything it infers is in the Mirror panel: every signal, every gate, every memory. Yours to read, export and delete.</p>
          </div>
          <p className="mt-6 text-xs text-clay-haze/80">If you're in crisis right now: in the US call or text <strong className="text-clay-surface">988</strong>; in the UK call <strong className="text-clay-surface">116 123</strong>; in India call <strong className="text-clay-surface">14416</strong>; elsewhere see <a className="underline" href="https://findahelpline.com" target="_blank" rel="noreferrer">findahelpline.com</a>. If you're in immediate danger, call your local emergency number.</p>
        </div>
      </div>
    </section>
  );
}

export function Cta({ chatHref = "/login" }: { chatHref?: string }) {
  return (
    <section className="px-6 pb-24 pt-8">
      <div className="clay-peach mx-auto max-w-3xl p-10 text-center sm:p-14">
        <h2 className="font-serif text-3xl tracking-tight">Start with a name. That's all it needs.</h2>
        <p className="mx-auto mt-3 max-w-md text-clay-ink/70">No password, no account. Whatever you type becomes your key, and the chat opens straight away.</p>
        <Link href={chatHref} className="clay-btn-dark mt-8 text-base">Chat with Ori</Link>
      </div>
    </section>
  );
}
