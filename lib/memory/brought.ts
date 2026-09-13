/**
 * Which memories a reply actually brought up. Retrieval hands the model up to
 * nine; showing all of them as "brought up" would overstate what happened.
 * A memory counts when the reply shares a name or two distinctive words with it.
 */
import type { MemoryItem } from ".";

const STOP = new Set("their they them this that with from have has been were when what your about there would could should which after before again still just really also into over only more most some very much like well even back where while other the and for are was not but you she her his him its our".split(" "));

function salient(text: string): { names: Set<string>; words: Set<string> } {
  const names = new Set<string>(), words = new Set<string>();
  const toks = text.match(/[\p{L}][\p{L}'-]*/gu) ?? [];
  toks.forEach((t, i) => {
    const low = t.toLowerCase();
    if (/^\p{Lu}/u.test(t) && i > 0 && low.length >= 3 && !STOP.has(low)) names.add(low);
    if (low.length >= 5 && !STOP.has(low)) words.add(low.replace(/(ing|ed|es|s)$/, ""));
  });
  return { names, words };
}

export function broughtUp(reply: string, memories: MemoryItem[]): MemoryItem[] {
  const r = salient(reply);
  const replyWords = new Set([...r.words, ...(reply.toLowerCase().match(/[\p{L}]{5,}/gu) ?? []).map((w) => w.replace(/(ing|ed|es|s)$/, ""))]);
  const replyLower = reply.toLowerCase();
  return memories.filter((m) => {
    const s = salient(m.text);
    if ([...s.names].some((n) => new RegExp(`\\b${n}\\b`, "i").test(replyLower))) return true;
    let shared = 0;
    for (const w of s.words) if (replyWords.has(w)) shared++;
    return shared >= 2;
  });
}

/** A person's name from a "person" memory, for pointing back to them. */
export function personName(m: MemoryItem): string | null {
  const toks = m.text.match(/[\p{L}][\p{L}'-]*/gu) ?? [];
  for (let i = 1; i < toks.length; i++) {
    const t = toks[i];
    if (/^\p{Lu}/u.test(t) && t.length >= 3 && !STOP.has(t.toLowerCase())) return t;
  }
  return null;
}
