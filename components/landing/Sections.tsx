import Link from "next/link";
import MockChat from "./MockChat";

const STRESS = [
  { who: "you" as const, text: "three deadlines, landlord emailing, haven't eaten properly since tuesday" },
  { who: "ori" as const, text: "That's a lot stacked on no food. Which of the three is actually due first?" },
  { who: "you" as const, text: "the report. friday" },
  { who: "ori" as const, text: "Then the landlord and the other two can wait until you've eaten something. What's in the kitchen right now?" },
];
const ANXIETY = [
  { who: "you" as const, text: "i'm fine. just can't sleep. keep thinking about the meeting" },
  { who: "ori" as const, text: "You've said 'fine' and then described a night of not sleeping. Which half should I believe?" },
  { who: "you" as const, text: "ok not fine. i think they're going to let me go" },
  { who: "ori" as const, text: "It makes sense you're braced for it, after the way last month went. What's the actual evidence, either way?" },
];
const DEPRESSION = [
  { who: "ori" as const, proactive: true, text: "Your messages have been getting shorter in the evenings this week, and you haven't mentioned Sam since the weekend. Am I reading that right?" },
  { who: "you" as const, text: "yeah. haven't really felt like anything" },
  { who: "ori" as const, text: "Okay. You don't have to feel like it. When did you last go outside - even the doorstep?" },
  { who: "you" as const, text: "monday maybe" },
  { who: "ori" as const, text: "Monday. Would you text Sam one line today? I'll ask how that went, not how this went." },
];

export function Hero({ chatHref = "/login" }: { chatHref?: string }) {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-16 sm:pt-24">
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
            <a href="#how" className="clay-btn">How it works</a>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[["text + voice", "reads words, tone and rhythm"], ["remembers", "your people, plans and past"], ["checks in", "when it matters, never at night"]].map(([t, d]) => (
              <div key={t} className="clay-in p-3">
                <div className="text-xs font-medium">{t}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-clay-muted">{d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <MockChat tilt={-1.5} lines={DEPRESSION} caption="An unprompted check-in, and why it happened - always visible." />
        </div>
      </div>
    </section>
  );
}

function Feature({ title, kicker, body, chat, flip = false, tone, card }: { title: string; kicker: string; body: React.ReactNode; chat: React.ReactNode; flip?: boolean; tone: string; card: string }) {
  return (
    <section className="px-6 py-10">
      <div className={`mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div className={`${card} p-8 sm:p-10`}>
          <div className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium shadow-clay-sm ${tone}`}>{kicker}</div>
          <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h2>
          <div className="mt-4 space-y-3 text-[15.5px] leading-relaxed text-clay-ink/75">{body}</div>
        </div>
        <div className="flex justify-center">{chat}</div>
      </div>
    </section>
  );
}

export function Features() {
  return (
    <>
      <Feature
        kicker="Stress" tone="bg-clay-surface text-clay-ink" card="clay-amber"
        title="When everything is due at once"
        body={<>
          <p>Stress is usually a sequencing problem wearing a catastrophe costume. Ori helps you find the first thing, and notices when basics - food, sleep, daylight - have quietly dropped off the list.</p>
          <p>It matches your pace: short when you're short, slower when you're spiralling. It doesn't cheerlead and it won't tell you it'll all be fine.</p>
        </>}
        chat={<MockChat tilt={1} lines={STRESS} caption="Concrete over profound. One question at a time." />}
      />
      <Feature flip
        kicker="Anxiety" tone="bg-clay-surface text-clay-ink" card="clay-haze"
        title="When 'fine' isn't"
        body={<>
          <p>Ori reads the gap between what you write and what you're showing - words, tone of voice, how you type - and asks about it, once, without insisting it knows better than you.</p>
          <p>Fear gets validated as making sense, not as being right. Then you look at the evidence together.</p>
        </>}
        chat={<MockChat tilt={-1} lines={ANXIETY} caption="Incongruence between the words and the rest gets named, gently." />}
      />
      <Feature
        kicker="Depression" tone="bg-clay-surface text-clay-ink" card="clay-sage"
        title="When you've gone quiet"
        body={<>
          <p>Low mood hides in the pattern, not the message: shorter replies, later nights, fewer people mentioned. Ori tracks that across days and reaches out when the trend is real - not because a timer went off.</p>
          <p>Every check-in says what prompted it. If you don't answer, it stops. If you're in danger, it stops everything else and shows real crisis lines - never made-up numbers.</p>
        </>}
        chat={<MockChat tilt={1.5} lines={DEPRESSION} caption="The bridge, not the destination: it points you back at people." />}
      />
    </>
  );
}

const STEPS = [
  { t: "It reads more than words", d: "Text, tone of voice and typing rhythm are fused into one read - eight emotional axes and nuanced states like loneliness, dread, relief - each weighed by how sure it is." },
  { t: "It remembers", d: "Names, plans, the story of you. Memories are short facts you can see and delete, not transcripts. It asks about your past because a life with earlier chapters is easier to carry." },
  { t: "It checks in - carefully", d: "Mornings, isolated evenings, long silences, and real downward trends. Quiet hours, a daily cap, and a hard stop if you go unanswered three times." },
  { t: "It knows its limits", d: "It's software and says so. It measures how much you rely on it and pulls back when that climbs. Crisis lines are hard-coded and shown automatically." },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-serif text-3xl tracking-tight sm:text-4xl">How it works</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
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

export function Safety() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="clay-dark p-8 sm:p-10">
          <h2 className="font-serif text-2xl sm:text-3xl">What this is not</h2>
          <div className="mt-4 grid gap-6 text-sm leading-relaxed text-clay-haze sm:grid-cols-3">
            <p><strong className="text-clay-surface">Not therapy.</strong> Ori can sit with you between the times you talk to people who can do more. It cannot diagnose, treat, or replace care.</p>
            <p><strong className="text-clay-surface">Not a person.</strong> It doesn't have feelings and won't pretend to. It won't be your partner, and it won't tell you it's waiting for you - it isn't running.</p>
            <p><strong className="text-clay-surface">Not private from you.</strong> Everything it infers is in the Mirror panel: every signal, every gate, every memory. Yours to read and delete.</p>
          </div>
          <p className="mt-6 text-xs text-clay-haze/80">If you're in crisis right now: in the US call or text <strong className="text-clay-surface">988</strong>; in the UK call <strong className="text-clay-surface">116 123</strong>; elsewhere see <a className="underline" href="https://findahelpline.com" target="_blank" rel="noreferrer">findahelpline.com</a>. If you're in immediate danger, call your local emergency number.</p>
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
