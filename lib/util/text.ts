/**
 * Phone keyboards type curly apostrophes and quotes by default (’ ‘ “ ”). Every
 * pattern in this app is written with straight ones, so text is normalised
 * before any pattern runs. Without this, "I don’t want to be here" typed on a
 * phone was not recognised as passive ideation.
 */
export function normalizeQuotes(text: string): string {
  return text.replace(/[‘’‛ʼ′＇]/g, "'").replace(/[“”‟″＂]/g, '"');
}
