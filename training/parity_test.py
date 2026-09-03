"""Writes tests/fixtures/parity.json: the TS side must reproduce every entry."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from hashing import tokenize, fnv1a32, hash_feature

TEXTS = [
    "I'm fine. Just tired, I guess.",
    "not good at all... can't sleep, can't eat",
    "sooooo happy today!!! we finally did it",
    "Why does nobody ever call? I don't get it.",
    "Talked to Maya (sis) 2 days ago - it went ok?",
    "check https://example.com or mail me at a.b@c.io",
    "“whatever” she said, then left \U0001F60A",
    "ok",
]
DIM = 262144
out = []
for t in TEXTS:
    feats, words = tokenize(t)
    out.append({
        "text": t, "features": feats, "words": words,
        "hashes": [fnv1a32(f) for f in feats],
        "buckets": [list(hash_feature(f, DIM)) for f in feats],
    })
path = os.path.join(os.path.dirname(__file__), "..", "tests", "fixtures", "parity.json")
with open(path, "w") as f:
    json.dump({"dim": DIM, "cases": out}, f, indent=1, ensure_ascii=False)
print(f"wrote {len(out)} cases to {os.path.relpath(path)}")
