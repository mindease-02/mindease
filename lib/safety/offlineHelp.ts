import { EMERGENCY_NUMBERS, HELPLINES, LANGUAGE_LINES, SITUATIONS } from "./resources";
import { t } from "../i18n";

/**
 * The offline help page: one self-contained HTML file with no scripts, no
 * stylesheets and no fonts to fetch, so it opens with no connection at all.
 * The service worker precaches it and serves it whenever a page cannot be
 * reached. Every number comes from resources.ts; nothing is typed in here.
 * `npm run offline-help` writes it to public/offline-help.html.
 */
const LANGS = ["en", "ta", "hi", "te", "kn", "ml"] as const;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

/** First dialable number in a contact string: "Call 14416 or 1800-891-4416" -> "14416". */
export function telOf(contact: string): string | null {
  const m = contact.match(/\+?\d[\d\s-]{1,}\d/);
  return m ? m[0].replace(/[\s-]/g, "") : null;
}

function line(name: string, contact: string, note?: string): string {
  const tel = telOf(contact);
  const shown = tel ? `<a href="tel:${esc(tel)}">${esc(contact)}</a>` : esc(contact);
  return `<li><b>${esc(name)}</b><span>${shown}</span>${note ? `<small>${esc(note)}</small>` : ""}</li>`;
}

export function renderOfflineHelp(): string {
  const india = HELPLINES.filter((h) => h.region === "IN");
  const abroad = HELPLINES.filter((h) => h.region !== "IN" && h.region !== "*");
  const notes = LANGS.map((l) => `<p lang="${l}" class="note">${esc(t("offlineNote", l))}</p>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(t("helpTitle", "en"))} | MindEase</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 28px 18px 60px; background: #07080b; color: #ecebe7; font: 17px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 680px; margin-inline: auto; }
  h1 { font-size: 1.9rem; margin: 0 0 6px; font-weight: 600; }
  h2 { font-size: 1.05rem; margin: 30px 0 10px; color: #b9b9c2; font-weight: 600; }
  .note { margin: 0 0 4px; color: #b9b9c2; }
  .big { display: block; margin: 18px 0; padding: 18px 20px; border-radius: 16px; background: #14161d; border: 1px solid #262833; text-decoration: none; color: #ecebe7; }
  .big b { display: block; font-size: 1.7rem; letter-spacing: .01em; }
  .big span { color: #b9b9c2; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: grid; gap: 2px; padding: 12px 0; border-bottom: 1px solid #1f2028; }
  li b { font-weight: 600; }
  li small { color: #7e7f8a; font-size: .88rem; }
  a { color: #7fd0e0; }
  .foot { margin-top: 36px; color: #7e7f8a; font-size: .9rem; }
</style>
</head>
<body>
<main>
<h1>${esc(t("helpTitle", "en"))}</h1>
${notes}
<a class="big" href="tel:14416"><b>14416</b><span>Tele-MANAS, Government of India. Free, 24 hours, 20 Indian languages.</span></a>
<a class="big" href="tel:${EMERGENCY_NUMBERS.IN}"><b>${EMERGENCY_NUMBERS.IN}</b><span>Emergency: police, ambulance, fire.</span></a>
<h2>India</h2>
<ul>
${india.map((h) => line(h.name, h.contact, h.note)).join("\n")}
</ul>
<h2>In your language</h2>
<ul>
${Object.values(LANGUAGE_LINES).map((h) => line(h.name, h.contact, h.note)).join("\n")}
</ul>
<h2>For a specific situation</h2>
<ul>
${SITUATIONS.map((s) => line(s.name, s.contact, s.note)).join("\n")}
</ul>
<h2>Outside India</h2>
<ul>
${abroad.map((h) => line(`${h.name} (${h.region})`, h.contact, h.note)).join("\n")}
${line("Emergency numbers", Object.entries(EMERGENCY_NUMBERS).map(([k, v]) => `${k} ${v}`).join(", "))}
</ul>
<p class="foot">${esc(t("helpVerified", "en"))} MindEase is software, not a clinician. When you are back online, mindease-taupe.vercel.app/help has the full list with opening hours.</p>
</main>
</body>
</html>
`;
}
