"""
Train the hashed linear emotion head on GoEmotions and export it as the sparse
int8 JSON that lib/affect/classifier.ts consumes.

    python training/train_text_heads.py --dim 262144 --topk 3000

Pipeline: tokenize (hashing.py, parity-checked) -> signed hashing trick ->
L2 normalise -> one logistic regression per label (one-vs-rest) -> prune to
top-K |w| per label -> int8 quantise -> Platt-calibrate on validation using the
*pruned, quantised* scores (so calibration reflects what actually ships) ->
models/emotion.model.json.
"""
from __future__ import annotations
import argparse, json, os, sys, time
import numpy as np
from scipy import sparse
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score

sys.path.insert(0, os.path.dirname(__file__))
from hashing import featurize

LABELS = [
    "admiration", "amusement", "anger", "annoyance", "approval", "caring",
    "confusion", "curiosity", "desire", "disappointment", "disapproval",
    "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
    "joy", "love", "nervousness", "optimism", "pride", "realization",
    "relief", "remorse", "sadness", "surprise", "neutral",
]


def to_csr(texts, dim):
    rows, cols, vals = [], [], []
    for i, t in enumerate(texts):
        for k, v in featurize(t, dim).items():
            rows.append(i); cols.append(k); vals.append(v)
    return sparse.csr_matrix((vals, (rows, cols)), shape=(len(texts), dim), dtype=np.float32)


def platt(z, y, iters=200):
    """Fit p = sigmoid(a z + b) by Newton steps on the log-loss (Platt 1999)."""
    a, b = 1.0, 0.0
    # prior-corrected targets, as in the original paper
    n1, n0 = y.sum(), len(y) - y.sum()
    t = np.where(y == 1, (n1 + 1) / (n1 + 2), 1 / (n0 + 2))
    for _ in range(iters):
        p = 1 / (1 + np.exp(-(a * z + b)))
        g_a = np.sum((p - t) * z); g_b = np.sum(p - t)
        w = p * (1 - p) + 1e-9
        h_aa = np.sum(w * z * z) + 1e-6; h_ab = np.sum(w * z); h_bb = np.sum(w) + 1e-6
        det = h_aa * h_bb - h_ab * h_ab
        da = (h_bb * g_a - h_ab * g_b) / det; db = (h_aa * g_b - h_ab * g_a) / det
        a -= da; b -= db
        if abs(da) < 1e-6 and abs(db) < 1e-6:
            break
    return float(a), float(b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dim", type=int, default=262144)
    ap.add_argument("--topk", type=int, default=3000)
    ap.add_argument("--C", type=float, default=2.0)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "models", "emotion.model.json"))
    args = ap.parse_args()

    from datasets import load_dataset
    t0 = time.time()
    ds = load_dataset("google-research-datasets/go_emotions", "simplified")
    names = ds["train"].features["labels"].feature.names
    assert names == LABELS, f"label order changed: {names}"

    def xy(split):
        texts = ds[split]["text"]
        Y = np.zeros((len(texts), len(LABELS)), dtype=np.int8)
        for i, ls in enumerate(ds[split]["labels"]):
            for l in ls:
                Y[i, l] = 1
        return to_csr(texts, args.dim), Y

    Xtr, Ytr = xy("train"); Xva, Yva = xy("validation"); Xte, Yte = xy("test")
    print(f"featurised {Xtr.shape[0]}/{Xva.shape[0]}/{Xte.shape[0]} in {time.time()-t0:.1f}s")

    idx_out, w_out, scale_out, intercept_out, a_out, b_out = [], [], [], [], [], []
    f1s = []
    for j, label in enumerate(LABELS):
        clf = LogisticRegression(C=args.C, solver="liblinear", class_weight="balanced", max_iter=200)
        clf.fit(Xtr, Ytr[:, j])
        w = clf.coef_[0]
        keep = np.argsort(-np.abs(w))[: args.topk]
        keep = np.sort(keep)
        wk = w[keep]
        scale = float(np.max(np.abs(wk)) / 127.0) if len(wk) else 1.0
        q = np.clip(np.round(wk / scale), -127, 127).astype(np.int8)
        # scores as the TS runtime will compute them
        Wq = sparse.csr_matrix((q.astype(np.float32) * scale, (keep, np.zeros(len(keep), dtype=int))), shape=(args.dim, 1))
        z_va = (Xva @ Wq).toarray().ravel() + clf.intercept_[0]
        a, b = platt(z_va, Yva[:, j])
        z_te = (Xte @ Wq).toarray().ravel() + clf.intercept_[0]
        p_te = 1 / (1 + np.exp(-(a * z_te + b)))
        f1 = f1_score(Yte[:, j], (p_te > 0.5).astype(int), zero_division=0)
        f1s.append(f1)
        print(f"{label:15s} F1={f1:.3f}  kept={len(keep)}  a={a:.2f} b={b:.2f}")
        idx_out.append(keep.tolist()); w_out.append(q.tolist()); scale_out.append(scale)
        intercept_out.append(float(clf.intercept_[0])); a_out.append(a); b_out.append(b)

    model = {
        "version": time.strftime("%Y-%m-%d") + "-goemotions-hashed",
        "dim": args.dim, "outputs": LABELS, "scale": scale_out, "intercept": intercept_out,
        "idx": idx_out, "w": w_out, "calibration": {"a": a_out, "b": b_out}, "normalize": "l2",
        "meta": {"dataset": "google-research-datasets/go_emotions:simplified", "topk": args.topk, "C": args.C,
                 "macro_f1_test": float(np.mean(f1s)), "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S")},
    }
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w") as f:
        json.dump(model, f, separators=(",", ":"))
    print(f"macro-F1 (test) {np.mean(f1s):.3f}; wrote {os.path.relpath(args.out)} ({os.path.getsize(args.out)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
