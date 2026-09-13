# Changing how MindEase talks

MindEase does not change itself. People change it, and every change passes the
same gate. This is the "Hard line" in `docs/mindease-system-prompt.md`.

## 1. Look at the evidence
`GET /api/admin/review` with `Authorization: Bearer $ADMIN_SECRET` returns
aggregate counts only, with no message text:
- check-in "not useful" rates by style, and mean outcome score by style
- reply ratings by reason
- read corrections by pair (what the read said, what the person meant)
- how often the reply guard had to rewrite, by issue
- memory approvals (kept vs proposed) and memory mode choices

## 2. Author the change
Edit `docs/mindease-system-prompt.md` first, then `lib/prompt/persona.ts` (and
`lib/prompt/guard.ts` if a rule needs enforcing). Add eval cases for the failure
you are fixing to `evals/eval-cases.json` or `evals/run-language.mts`.

## 3. Pass the gate
```bash
npm run gate
```
This runs the unit tests, the scorer eval (eight-axis read, tone/word mismatch,
low-signal confidence, oblique memory, crisis flag, figures of speech), and the
live language eval (dependency language, secrecy, special bond, probing a
disclosure, platitudes, labels, invented history, made-up numbers, honesty and
disagreement, framework guardrails, crisis). All must pass. The unit tests also
run before every production build.

## 4. Review
A second person reads the diff and the eval output. Crisis thresholds, trauma
rules, and anti-dependency language also need a licensed clinician's review
before wider release.
