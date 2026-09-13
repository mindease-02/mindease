/**
 * How sure MindEase is of a read, in one place so the chat and the eval agree.
 *
 * The heuristic rises with how much emotional signal the words carry (coverage)
 * and with any behavioural channels the person allowed. The model's own report
 * can lower it, and for messages of six words or more can raise it to 0.8.
 * Very short messages are capped low regardless.
 */
export function readConfidence(args: { source: string; coverage: number; snapshot: number; model?: number; text: string }): number {
  const heuristic = Math.max(args.snapshot, args.source === "model" ? Math.min(0.85, 0.45 + args.coverage * 0.5) : 0);
  const words = args.text.trim().split(/\s+/).filter(Boolean).length;
  let c = heuristic;
  if (args.source === "model" && typeof args.model === "number") {
    // A substantive message the word list barely covers can still be clear; let the model raise it, to a cap.
    c = words >= 6 && args.model > heuristic ? Math.min(args.model, 0.8) : Math.min(heuristic, Math.max(0.15, args.model));
  }
  if (words <= 2) c = Math.min(c, 0.35);
  else if (words <= 4) c = Math.min(c, 0.5);
  return Number(c.toFixed(3));
}
