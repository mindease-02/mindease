"""
Tokenizer + hashing that MUST match lib/affect/tokenize.ts and lib/affect/hash.ts
byte for byte. parity_test.py writes a fixture that tests/parity.test.ts checks
against the TypeScript side; run both after touching either implementation.

Known, accepted divergence: JS uses \\p{Extended_Pictographic}; Python's `re`
has no such class, so a range approximation is used. Ordinary emoji match on
both sides; a few symbols (©, ®, ™) would not.
"""
from __future__ import annotations
import re

NEGATORS = {
    "not", "no", "never", "cannot", "cant", "wont", "dont", "doesnt", "didnt",
    "isnt", "arent", "wasnt", "werent", "havent", "hasnt", "hadnt", "aint",
    "neither", "nor", "without", "hardly", "barely", "rarely",
}
CLAUSE_BREAK = {".", "!", "?", ",", ";", ":", "but", "though", "however", "although"}
NEG_WINDOW = 3
CONTRACTIONS = [("n't", " not"), ("'re", " are"), ("'s", " is"), ("'d", " would"),
                ("'ll", " will"), ("'ve", " have"), ("'m", " am")]

_URL = re.compile(r"https?://\S+|www\.\S+")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
_NUM = re.compile(r"\d[\d,.]*")
_EMOJI = "☀-➿⬀-⯿\U0001F000-\U0001FAFF〰〽㊗㊙©®™ℹ"
WORD_RE = re.compile(r"<[a-z]+>|[a-z]+|[" + _EMOJI + r"]|[!?.,;:]+")
_ELONG = re.compile(r"(.)\1\1+")


def normalize(text: str) -> str:
    t = text.lower()
    t = _URL.sub(" <url> ", t)
    t = _EMAIL.sub(" <email> ", t)
    t = _NUM.sub(" <num> ", t)
    t = t.replace("‘", "'").replace("’", "'").replace("“", '"').replace("”", '"')
    for k, v in CONTRACTIONS:
        t = t.replace(k, v)
    return t


def tokenize(text: str) -> tuple[list[str], list[str]]:
    """Returns (features, words) exactly like tokenize.ts."""
    raw = WORD_RE.findall(normalize(text))
    words: list[str] = []
    shape: list[str] = []
    for r in raw:
        if re.fullmatch(r"<[a-z]+>", r):
            words.append(r)
        elif re.fullmatch(r"[a-z]+", r):
            collapsed = _ELONG.sub(r"\1\1", r)
            if collapsed != r:
                shape.append("<elong>")
            words.append(collapsed)
        elif re.fullmatch(r"[!?.,;:]+", r):
            if re.fullmatch(r"\.{3,}", r):
                shape.append("<ellipsis>")
            elif len(r) > 1:
                shape.append("<punct_run>")
            if "!" in r:
                shape.append("<excl>")
            if "?" in r:
                shape.append("<qmark>")
            words.append(r[0])
        else:
            shape.append("<emoji>")
            words.append(r)

    features: list[str] = []
    neg_left = 0
    for i, w in enumerate(words):
        if w in CLAUSE_BREAK:
            neg_left = 0
        if w in NEGATORS:
            neg_left = NEG_WINDOW
            features.append(w)
            continue
        features.append(("NOT_" + w) if neg_left > 0 else w)
        if neg_left > 0:
            neg_left -= 1
        if i > 0:
            features.append(words[i - 1] + "|" + w)
    features.extend(shape)
    if len(words) <= 4:
        features.append("<terse>")
    return features, [w for w in words if re.match(r"^[a-z]", w)]


def fnv1a32(s: str) -> int:
    """FNV-1a over the low byte of each UTF-16 code unit, like charCodeAt & 0xff."""
    h = 0x811C9DC5
    for unit in s.encode("utf-16-le")[0::2]:
        h ^= unit
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def hash_feature(token: str, dim: int) -> tuple[int, int]:
    """Index from the token's hash; sign from an independent hash of "\x01" + token (as hash.ts)."""
    h = fnv1a32(token)
    s = fnv1a32("\x01" + token)
    return h % dim, 1 if (s & 1) == 1 else -1


def featurize(text: str, dim: int, l2: bool = True) -> dict[int, float]:
    feats, _ = tokenize(text)
    vec: dict[int, float] = {}
    for f in feats:
        idx, sign = hash_feature(f, dim)
        vec[idx] = vec.get(idx, 0.0) + sign
    if l2:
        n = sum(v * v for v in vec.values()) ** 0.5
        if n > 0:
            vec = {k: v / n for k, v in vec.items()}
    return vec
