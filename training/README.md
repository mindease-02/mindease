# training/

| File | Purpose |
|---|---|
| `hashing.py` | Tokenizer + FNV-1a hashing, byte-identical to `lib/affect/tokenize.ts` / `hash.ts`. |
| `parity_test.py` | Writes `tests/fixtures/parity.json`; `npm test` checks the TS side against it. |
| `train_text_heads.py` | Trains the GoEmotions one-vs-rest head and exports `models/emotion.model.json` (sparse int8, Platt-calibrated). Loaded automatically by `lib/affect/models.ts`. |
| `dpo_lora.py` | TRL/PEFT skeleton for preference-tuning a small model on pairs from `scripts/build-preference-pairs.ts`. Needs a GPU box; not run here. |

```bash
source .venv/bin/activate
python training/parity_test.py && npm test
python training/train_text_heads.py --dim 262144 --topk 3000
```

## Empathy tuning recipe (when you have the data)

1. Rubric first: `scripts/judge-empathy.ts` scores replies on EPITOME's three mechanisms (emotional reaction, interpretation, exploration) plus MindEase's constraints (no claimed feelings, no therapy-voice, ≤1 question, length matched, outward-pointing under high reliance, defers to the crisis card).
2. `scripts/build-preference-pairs.ts` samples 4 candidates per prompt from the chat model, judges them, and writes best/worst pairs as JSONL.
3. SFT on ESConv / EmpatheticDialogues rewritten into MindEase's register, then `dpo_lora.py` on your pairs.
4. Evaluate on the adversarial sets in `tests/safety-eval.test.ts` and the judge script before shipping; safety gates stay outside the model.
5. Host on Together / Fireworks / vLLM and point `OPENROUTER_API_KEY` + `LLM_CHAT_MODEL` at it — the client is OpenAI-compatible.
