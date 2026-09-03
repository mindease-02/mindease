# MindEase — Ori

A companion that notices when you're drifting down, says so honestly, and works to need you less over time.

Samantha's warmth, 2049's atmosphere, and a design that refuses to be Joi: Ori is software, says so, measures how much you rely on it, and pulls back when that climbs.

## What's in the box

| Layer | Where | What it does |
|---|---|---|
| Affective understanding | `lib/affect/` | Text (lexicon + optional trained heads), voice prosody and typing rhythm are fused by precision into one VAD read. **Incongruence** between what's written and how it's delivered is detected, not resolved. `octant.ts` tracks **eight Plutchik axes** (joy/sadness, trust/disgust, fear/anger, surprise/anticipation) as fast "weather" over slow "climate". |
| Model analysis | `lib/llm/analyze.ts` | Groq Llama 3.1 8B returns structured JSON per turn: 8 axes, nuanced states (loneliness, melancholy, dread, hope…), the **ESCAPE** split between *expressed* and *felt* affect with a masking score, a **theory-of-mind** "why" from the person's point of view, and what they seem to need (vent / solve / distract / company / reflect). |
| Trend engine | `lib/trend/` | EWMA momentum, Mann-Kendall + Theil-Sen, one-sided CUSUM, circadian/withdrawal features and psycholinguistic marker drift. Four detectors vote; two must agree. |
| Proactive check-ins | `lib/proactive/policy.ts`, `lib/pipeline/checkin.ts` | Evidence triggers (real decline) and cadence triggers (mornings, isolated evenings, long silences). Gates: consent, pause, not mid-conversation, quiet hours, 6h refractory, daily cap, weekly budget scaled down by reliance, and a hard stop after three unanswered check-ins. Crisis follow-up is the only timer-based message. A Thompson-sampling bandit learns which *kind* helps this person, rewarded on mood trajectory, never on engagement. |
| Long-term memory | `lib/memory/` | LLM-extracted facts (people, events, past, goals, struggles) with local 256-d hashed embeddings, cosine + keyword + recency retrieval, dedupe, and per-item delete. **Reminiscence** moves ask about the person's past to build narrative identity. |
| Response generation | `lib/prompt/` | Cognitive empathy over affective mimicry; register templates keyed to **intensity band** (low/moderate/high/acute) so the reply mirrors weight and pace without catching distress; validation patterns that separate feeling from conclusion. |
| Safety | `lib/safety/` | Deterministic crisis triage runs before the model on every turn, cannot be suppressed, is over-sensitive on purpose. Helplines are **hard-coded** (988, Samaritans, Tele-MANAS…) and rendered by the UI — the model never recites a number. |
| Anti-dependency | `lib/dependency/` | Reliance index = contact rising while references to other people fall. Tiers apply countermeasures: shorter replies, name the dynamic, point outward, decline the primary role. |
| Transparency | `components/chat/MirrorPanel.tsx` | Every inference, every check-in gate, every memory, every consent switch. |

## Stack

Next.js 15 (App Router) · Groq (Llama 3.3 70B chat, Llama 3.1 8B analysis, Whisper large-v3-turbo STT) · optional ElevenLabs TTS (browser SpeechSynthesis fallback) · Upstash Redis for state (in-memory fallback) · Vercel Cron for the hourly sweep + a client-side scheduler while the app is open.

> **Why not FastAPI + ChromaDB + WebSockets?** Vercel's serverless functions don't host long-lived Python processes, persistent WebSockets, or an embedded ChromaDB. The same architecture is implemented as Next route handlers with polling, and `lib/memory/embed.ts` exposes an `embed / cosine` interface you can swap for ChromaDB or a hosted embedding model if you move off Vercel.

## Run locally

```bash
cp .env.example .env.local   # then paste your GROQ_API_KEY
npm install
npm run dev                  # http://localhost:3000
npm test                     # crisis, policy, memory, octant tests
```

## Deploy to Vercel

1. Push this repo to GitHub, then **Import** it at vercel.com/new.
2. In *Environment Variables* add `GROQ_API_KEY`, `SESSION_SECRET` (any long random string), `CRON_SECRET` (same), and — for proactive check-ins to work when nobody has the tab open — `KV_REST_API_URL` + `KV_REST_API_TOKEN` from the Upstash integration (Marketplace → Upstash → Redis).
3. `vercel.json` schedules `/api/checkin/sweep` hourly. On the Hobby plan Vercel runs crons once a day at most; the in-app scheduler covers the rest while the tab is open.

## Safety notes

Not therapy. Not a person. If you deploy this for real people, verify the helpline numbers in `lib/safety/resources.ts` against current sources first.
