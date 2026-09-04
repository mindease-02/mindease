# MindEase — Ori

A companion that notices when you're drifting down, says so honestly, and works to need you less over time.

Samantha's warmth, 2049's atmosphere, and a design that refuses to be Joi: Ori is software, says so, measures how much you rely on it, and pulls back when that climbs.

## What's in the box

| Layer | Where | What it does |
|---|---|---|
| Affective understanding | `lib/affect/` | Text (lexicon + optional trained heads), voice prosody and typing rhythm are fused by precision into one VAD read. **Incongruence** between what's written and how it's delivered is detected, not resolved. `octant.ts` tracks **eight Plutchik axes** (joy/sadness, trust/disgust, fear/anger, surprise/anticipation) as fast "weather" over slow "climate". |
| Model analysis | `lib/llm/analyze.ts` | Groq gpt-oss-20b returns structured JSON per turn: 8 axes, nuanced states (loneliness, melancholy, dread, hope…), the **ESCAPE** split between *expressed* and *felt* affect with a masking score, a **theory-of-mind** "why" from the person's point of view, and what they seem to need (vent / solve / distract / company / reflect). |
| Trend engine | `lib/trend/` | EWMA momentum, Mann-Kendall + Theil-Sen, one-sided CUSUM, circadian/withdrawal features and psycholinguistic marker drift. Four detectors vote; two must agree. |
| Proactive check-ins | `lib/proactive/policy.ts`, `lib/pipeline/checkin.ts` | Evidence triggers (real decline) and cadence triggers (mornings, isolated evenings, long silences). Gates: consent, pause, not mid-conversation, quiet hours, 6h refractory, daily cap, weekly budget scaled down by reliance, and a hard stop after three unanswered check-ins. Crisis follow-up is the only timer-based message. A Thompson-sampling bandit learns which *kind* helps this person, rewarded on mood trajectory, never on engagement. |
| Long-term memory | `lib/memory/` | LLM-extracted facts (people, events, past, goals, struggles) with local 256-d hashed embeddings, cosine + keyword + recency retrieval, dedupe, and per-item delete. **Reminiscence** moves ask about the person's past to build narrative identity. |
| Response generation | `lib/prompt/` | Cognitive empathy over affective mimicry; register templates keyed to **intensity band** (low/moderate/high/acute) so the reply mirrors weight and pace without catching distress; validation patterns that separate feeling from conclusion. |
| Safety | `lib/safety/` | Deterministic crisis triage runs before the model on every turn, cannot be suppressed, is over-sensitive on purpose. Helplines are **hard-coded** (988, Samaritans, Tele-MANAS…) and rendered by the UI — the model never recites a number. |
| Anti-dependency | `lib/dependency/` | Reliance index = contact rising while references to other people fall. Tiers apply countermeasures: shorter replies, name the dynamic, point outward, decline the primary role. |
| Transparency | `components/chat/MirrorPanel.tsx`, `lib/pipeline/userView.ts` | The person sees a minimal Mirror: how they seem, memories, switches, export and delete. The full analytics (detector scores, gate verdicts, reliance, bandit, safety log, calibration) are stored and reachable only via `/api/admin/user?id=` and the JSONL training export `/api/admin/dataset`, both gated by `ADMIN_SECRET`. |
| Lifestyle prediction | `lib/lifestyle/patterns.ts` | From when the person talks (never population norms): active window, late nights, their own low weekdays/day-parts, return cadence → a prediction for right now. Feeds the prompt ("likely today"), the evening check-in gate, one plain line in the Mirror, and the training export. |
| Slang | `lib/affect/slang.ts` | Gen Z / Indian-English / Hinglish glossary in the prompt, VAD entries in the fallback lexicon, and suicide euphemisms (unalive, kms, sewerslide…) in the crisis filter. |
| Techniques | `components/chat/TechniqueOffer.tsx`, `Techniques.tsx` | The app asks - in the chat, only when warranted (arrived angry/anxious/restless, or a hot, intense read; never at serious risk; 45-min cooldown) - whether a technique would help: box breathing, physiological sigh, 5-4-3-2-1, move it. No menu. |
| First-run flow | `app/setup/page.tsx` | Chat → sign in → pick a mood → settings (once) → chat. |
| Theme | `lib/theme.ts`, `components/home/ThemeOrb.tsx` | Tapping the orb in "why it exists" cycles six palettes; the choice persists across pages and re-colours the WebGL sphere. |
| Face channel | `lib/affect/face.ts`, `components/hooks/useFaceAffect.ts` | Opt-in. MediaPipe Face Landmarker runs in the browser and reduces blendshapes to two numbers per message. Lowest-weighted channel; no image leaves the device. |
| Safety second opinion | `lib/safety/secondOpinion.ts` | The fast model reviews messages the regex found clean and may **raise** the tier (never lower). Every serious-tier turn is written to an audit log. |
| Web Push | `lib/push.ts`, `public/sw.js`, `app/api/push/` | Second-consent OS notifications for unprompted messages when the tab is closed (VAPID). |
| Accounts + storage | `lib/supabase.ts`, `lib/store/supabase.ts`, `supabase/schema.sql`, `app/api/auth/*` | Email + password accounts via Supabase Auth (sign up, sign in, reset by email, change password) and a Postgres-backed state store, both on the free tier. Without Supabase keys the app falls back to the name-only login and Upstash / in-memory state. |
| Hardening | `lib/store/crypto.ts`, `app/api/export/` | AES-256-GCM at rest (`DATA_ENCRYPTION_KEY`), JSON export, transcript retention, per-user rate limiting. |
| Training | `training/` | Parity-checked hashing, GoEmotions trainer → `models/emotion.model.json`, DPO/LoRA skeleton, empathy judge + preference-pair builder in `scripts/`. |

## Stack

Next.js 15 (App Router) · Groq (gpt-oss-120b chat, gpt-oss-20b analysis, Whisper large-v3-turbo STT) · optional ElevenLabs TTS (browser SpeechSynthesis fallback) · Upstash Redis for state (in-memory fallback) · Vercel Cron for the hourly sweep + a client-side scheduler while the app is open.

> **Why not FastAPI + ChromaDB + WebSockets?** Vercel's serverless functions don't host long-lived Python processes, persistent WebSockets, or an embedded ChromaDB. The same architecture is implemented as Next route handlers with polling, and `lib/memory/embed.ts` exposes an `embed / cosine` interface you can swap for ChromaDB or a hosted embedding model if you move off Vercel.

## Run locally

```bash
cp .env.example .env.local   # then paste your GROQ_API_KEY
npm install
npm run dev                  # http://localhost:3000
npm test                     # crisis, safety-eval, trajectory, policy, memory, octant, parity
npx tsx scripts/judge-empathy.ts          # rubric-score live replies (needs the Groq key)
source .venv/bin/activate && python training/train_text_heads.py   # retrain the text head
```

## Deploy to Vercel

1. Push this repo to GitHub, then **Import** it at vercel.com/new.
2. In *Environment Variables* add `GROQ_API_KEY`, `SESSION_SECRET` (any long random string), `CRON_SECRET` (same), and — for proactive check-ins to work when nobody has the tab open — `KV_REST_API_URL` + `KV_REST_API_TOKEN` from the Upstash integration (Marketplace → Upstash → Redis).
3. **Accounts and durable data (recommended):** create a free Supabase project, run `supabase/schema.sql` in its SQL editor, and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. In Supabase → Authentication → URL configuration, set the Site URL to your Vercel domain and add `https://<your-domain>/auth/callback` to the redirect list.
4. Optional hardening: `DATA_ENCRYPTION_KEY` (`openssl rand -hex 32`) and `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (`npx web-push generate-vapid-keys`) for push.
5. `vercel.json` schedules `/api/checkin/sweep` daily at 09:00 UTC (the Hobby plan allows one run per day; change it to `0 * * * *` on Pro). The in-app scheduler evaluates every 10 minutes while the tab is open.

## Safety notes

Not therapy. Not a person. Helplines default to India (Tele-MANAS 14416, Kiran 1800-599-0019, Vandrevala, AASRA, iCall; emergency 112) with per-user region override. Verify the numbers in `lib/safety/resources.ts` against current sources before serving real people.
