import { t } from "./index";

/**
 * A translated string with an English fallback: use it for brand-new copy
 * while its key is still being added to the six dictionaries. Once the key
 * exists in en.ts (and the others), t() wins and the fallback is unused.
 */
export function tx(key: string, lang: string | undefined, fallback: string, vars: Record<string, string> = {}): string {
  const v = t(key, lang, vars);
  if (v !== key) return v;
  let s = fallback;
  for (const [k, val] of Object.entries(vars)) s = s.split(`{${k}}`).join(val);
  return s;
}
