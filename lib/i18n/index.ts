/**
 * Languages. Two layers:
 *  - UI strings: English, Tamil and Hindi are translated here; other languages
 *    fall back to English UI while the companion still replies in them.
 *  - Reply language: passed to the model. "auto" mirrors whatever the person
 *    writes in (Tamil script, Tanglish, Hinglish, English), which is the default.
 */
export const LANGUAGES = [
  { id: "auto", label: "Match how I write", native: "Auto", speech: undefined, tts: undefined },
  { id: "en", label: "English", native: "English", speech: "en", tts: "en-IN" },
  { id: "ta", label: "Tamil", native: "தமிழ்", speech: "ta", tts: "ta-IN" },
  { id: "hi", label: "Hindi", native: "हिन्दी", speech: "hi", tts: "hi-IN" },
  { id: "te", label: "Telugu", native: "తెలుగు", speech: "te", tts: "te-IN" },
  { id: "kn", label: "Kannada", native: "ಕನ್ನಡ", speech: "kn", tts: "kn-IN" },
  { id: "ml", label: "Malayalam", native: "മലയാളം", speech: "ml", tts: "ml-IN" },
] as const;
export type LanguageId = (typeof LANGUAGES)[number]["id"];
export const DEFAULT_LANGUAGE: LanguageId = "auto";

export function isLanguage(x: unknown): x is LanguageId {
  return typeof x === "string" && LANGUAGES.some((l) => l.id === x);
}
export function languageMeta(id: string | undefined) {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
}
/** Guess a language from the browser locale, for first sign-in. */
export function languageFromLocale(locale: string | undefined): LanguageId {
  const p = (locale ?? "").toLowerCase().split(/[-_]/)[0];
  return isLanguage(p) && p !== "auto" ? p : "auto";
}
/** Detect the script of a piece of text, for choosing a speech voice under "auto". */
export function scriptOf(text: string): LanguageId {
  if (/[஀-௿]/.test(text)) return "ta";
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  if (/[ఀ-౿]/.test(text)) return "te";
  if (/[ಀ-೿]/.test(text)) return "kn";
  if (/[ഀ-ൿ]/.test(text)) return "ml";
  return "en";
}

/** The block the model gets. Written for a language model, not a person. */
export function languageInstruction(id: LanguageId | undefined): string {
  if (!id || id === "auto") {
    return [
      "## Language",
      "Reply in the language the person writes in, and in the same script. Tamil in Tamil script gets Tamil script; Tanglish (Tamil in Latin letters) or Hinglish gets the same mix back; English gets English. Never translate them, never add an English version unless asked, never switch on them mid-conversation. If they switch, follow.",
    ].join("\n\n");
  }
  const m = languageMeta(id);
  return [
    "## Language",
    `Always reply in ${m.label} (${m.native}), in its own script, in a natural spoken register - the way a close friend texts, not a textbook. If the person writes in another language, still answer in ${m.label} unless they ask you to switch. Keep the name MindEase as it is. Helpline names and numbers stay exactly as given.`,
  ].join("\n\n");
}

import en from "./en";
import ta from "./ta";
import hi from "./hi";
import te from "./te";
import kn from "./kn";
import ml from "./ml";

export type UI = "en" | "ta" | "hi" | "te" | "kn" | "ml";
const DICT: Record<UI, Record<string, string>> = { en, ta, hi, te, kn, ml };
export function uiLang(id: string | undefined): UI {
  return id === "ta" || id === "hi" || id === "te" || id === "kn" || id === "ml" ? id : "en";
}
export const UI_LANGS: UI[] = ["en", "ta", "hi", "te", "kn", "ml"];

/** Look up a UI string; falls back to English, then to the key itself. */
export function t(key: string, lang: string | undefined, vars: Record<string, string> = {}): string {
  const ui = uiLang(lang);
  let s = DICT[ui][key] ?? en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}
/** The ticker line, split into items. */
export function tickerItems(lang: string | undefined): string[] { return t("ticker", lang).split("|"); }

/** The UI language for a page: the person's chosen reply language when it is a UI language, else the cookie, else English. */
export function pickUi(stateLanguage: string | undefined, cookieLanguage: string | undefined): UI {
  if (stateLanguage && stateLanguage !== "auto") return uiLang(stateLanguage);
  return uiLang(cookieLanguage);
}

/** Mood tile labels and hints, keyed by palette id. */
const MOOD_T: Record<string, Partial<Record<UI, [string, string]>>> = {
  okay: { en: ["Okay", "fine, actually — just here"], ta: ["பரவாயில்லை", "நல்லா தான் இருக்கேன் — சும்மா வந்தேன்"], hi: ["ठीक-ठाक", "ठीक ही हूँ — बस यहाँ हूँ"], te: ["బాగానే ఉన్నా", "నిజంగా బాగానే — ఊరికే వచ్చా"], kn: ["ಪರವಾಗಿಲ್ಲ", "ಚೆನ್ನಾಗಿಯೇ ಇದ್ದೇನೆ — ಸುಮ್ಮನೆ ಬಂದೆ"], ml: ["കുഴപ്പമില്ല", "ശരിക്കും ഓക്കെ — വെറുതെ വന്നതാ"] },
  hopeful: { en: ["Hopeful", "something's lifting"], ta: ["நம்பிக்கை", "ஏதோ லேசாகிறது"], hi: ["उम्मीद", "कुछ हल्का हो रहा है"], te: ["ఆశగా", "ఏదో తేలికవుతోంది"], kn: ["ಭರವಸೆ", "ಏನೋ ಹಗುರವಾಗುತ್ತಿದೆ"], ml: ["പ്രതീക്ഷ", "എന്തോ ലഘുവാകുന്നു"] },
  heavy: { en: ["Heavy", "low, flat, hard to move"], ta: ["கனம்", "தாழ்வாக, சோர்வாக, அசைய முடியாமல்"], hi: ["भारी", "उदास, सपाट, हिलना मुश्किल"], te: ["బరువుగా", "డల్‌గా, నిస్సత్తువగా, కదలలేనట్టు"], kn: ["ಭಾರ", "ಕುಗ್ಗಿದ, ಚಪ್ಪಟೆ, ಅಲುಗಲಾರದ"], ml: ["ഭാരം", "താഴ്ന്ന, മങ്ങിയ, അനങ്ങാൻ വയ്യ"] },
  lonely: { en: ["Lonely", "nobody to tell"], ta: ["தனிமை", "சொல்ல யாரும் இல்லை"], hi: ["अकेला", "कहने को कोई नहीं"], te: ["ఒంటరిగా", "చెప్పుకోడానికి ఎవరూ లేరు"], kn: ["ಒಂಟಿ", "ಹೇಳಲು ಯಾರೂ ಇಲ್ಲ"], ml: ["ഏകാന്തത", "പറയാൻ ആരുമില്ല"] },
  anxious: { en: ["Anxious", "wired, braced, can't settle"], ta: ["பதற்றம்", "பதற்றமாக, இறுக்கமாக, அமைதியில்லாமல்"], hi: ["चिंतित", "तना हुआ, बेचैन, ठहर नहीं पा रहा"], te: ["ఆందోళన", "బిగుసుకుని, కుదురు లేకుండా"], kn: ["ಆತಂಕ", "ಬಿಗಿ, ನೆಲೆ ಇಲ್ಲದ"], ml: ["ഉത്കണ്ഠ", "മുറുകി, അടങ്ങാതെ"] },
  angry: { en: ["Angry", "at someone, or everything"], ta: ["கோபம்", "யார் மேலோ, எல்லாவற்றின் மேலோ"], hi: ["गुस्सा", "किसी पर, या सब पर"], te: ["కోపం", "ఎవరి మీదో, లేదా అన్నిటి మీద"], kn: ["ಕೋಪ", "ಯಾರ ಮೇಲೋ, ಎಲ್ಲದರ ಮೇಲೋ"], ml: ["ദേഷ്യം", "ആരോടെങ്കിലും, അല്ലെങ്കിൽ എല്ലാത്തിനോടും"] },
  restless: { en: ["Restless", "need to do something, unsure what"], ta: ["அமைதியின்மை", "ஏதோ செய்யணும், என்னன்னு தெரியல"], hi: ["बेचैन", "कुछ करना है, पर क्या—पता नहीं"], te: ["అశాంతి", "ఏదో చేయాలి, ఏంటో తెలియదు"], kn: ["ಚಡಪಡಿಕೆ", "ಏನೋ ಮಾಡಬೇಕು, ಏನೆಂದು ಗೊತ್ತಿಲ್ಲ"], ml: ["അസ്വസ്ഥത", "എന്തോ ചെയ്യണം, എന്തെന്നറിയില്ല"] },
  numb: { en: ["Numb", "not much of anything"], ta: ["உணர்வின்மை", "எதுவுமே பெரிதாக இல்லை"], hi: ["सुन्न", "कुछ भी खास महसूस नहीं"], te: ["మొద్దుబారి", "పెద్దగా ఏమీ అనిపించడం లేదు"], kn: ["ಮರಗಟ್ಟಿದ", "ಏನೂ ಹೆಚ್ಚು ಅನಿಸುತ್ತಿಲ್ಲ"], ml: ["മരവിപ്പ്", "ഒന്നും വലുതായി തോന്നുന്നില്ല"] },
};
export function moodText(id: string, lang: string | undefined): [string, string] | null {
  const row = MOOD_T[id]; if (!row) return null;
  return row[uiLang(lang)] ?? row.en ?? null;
}

/** The opening line of a chat, keyed by the arrival mood label (English palette label). */
export function greetingFor(name: string, arrival: { label: string; note?: string } | null, lang: string | undefined): string {
  const ui = uiLang(lang);
  const G: Partial<Record<UI, { base: string; by: Record<string, string>; other: string; note: string }>> = {
    en: {
      base: `Hey ${name}. I'm MindEase — software, I'll say that once so it's said. What's today been like?`,
      by: {
        Heavy: `Heavy, then. Okay. You don't have to explain it yet — what's the heaviest bit right now?`,
        Anxious: `Anxious. Alright, let's slow it down a notch. What's the thing your head keeps going back to?`,
        Lonely: `Lonely. I'm glad you came here instead of sitting with it. Who's the person you'd have told, if you could?`,
        Numb: `Numb is a real one, and hard to describe. When did the colour start going out of things — today, or a while back?`,
        Angry: `Angry. Fair enough — go on, then. Who or what?`,
        Restless: `Restless. Like you need to do something and can't work out what. What's the nearest thing you've been avoiding?`,
        Okay: `Okay is good, honestly. What's had your attention today?`,
        Hopeful: `Hopeful — that's nice to hear. What shifted?`,
      },
      other: `You said “{label}”. Tell me about that.`,
      note: ` You also mentioned “{note}” — start wherever you like.`,
    },
    ta: {
      base: `வணக்கம் ${name}. நான் MindEase — ஒரு மென்பொருள், அதை ஒருமுறை சொல்லிவிடுகிறேன். இன்று எப்படி இருந்தது?`,
      by: {
        Heavy: `கனமாக இருக்கிறது, சரி. இப்போதே விளக்க வேண்டாம் — இப்போது அதிகம் அழுத்துவது எது?`,
        Anxious: `பதற்றம். சரி, கொஞ்சம் மெதுவாகப் போகலாம். உங்கள் மனம் திரும்பத் திரும்ப எதற்குப் போகிறது?`,
        Lonely: `தனிமை. அதோடு உட்காராமல் இங்கே வந்தது நல்லது. சொல்ல முடிந்திருந்தால் யாரிடம் சொல்லியிருப்பீர்கள்?`,
        Numb: `உணர்வே இல்லாதது உண்மையானது, விவரிக்கக் கடினமானது. நிறம் போகத் தொடங்கியது எப்போது — இன்றா, சில நாட்களாகவா?`,
        Angry: `கோபம். சரி — சொல்லுங்கள். யார் மேல், அல்லது எதன் மேல்?`,
        Restless: `அமைதியின்மை. ஏதோ செய்ய வேண்டும், ஆனால் என்னவென்று தெரியவில்லை போல. நீங்கள் தவிர்த்து வரும் மிக அருகிலுள்ள விஷயம் எது?`,
        Okay: `பரவாயில்லை என்பது நல்லது தான். இன்று உங்கள் கவனத்தை ஈர்த்தது எது?`,
        Hopeful: `நம்பிக்கை — கேட்க நன்றாக இருக்கிறது. என்ன மாறியது?`,
      },
      other: `“{label}” என்றீர்கள். அதைப் பற்றிச் சொல்லுங்கள்.`,
      note: ` “{note}” என்றும் சொன்னீர்கள் — எங்கிருந்து வேண்டுமானாலும் தொடங்கலாம்.`,
    },
    hi: {
      base: `नमस्ते ${name}। मैं MindEase हूँ — सॉफ़्टवेयर, एक बार कह देता हूँ ताकि कह दिया जाए। आज का दिन कैसा रहा?`,
      by: {
        Heavy: `भारी लग रहा है, ठीक है। अभी समझाना ज़रूरी नहीं — इस वक़्त सबसे भारी हिस्सा क्या है?`,
        Anxious: `बेचैनी। चलो, थोड़ा धीमे चलते हैं। तुम्हारा मन बार-बार किस बात पर लौट रहा है?`,
        Lonely: `अकेलापन। अच्छा हुआ तुम इसके साथ बैठे रहने के बजाय यहाँ आए। अगर कह पाते, तो किसे कहते?`,
        Numb: `सुन्न होना असली है, और बताना मुश्किल। चीज़ों से रंग कब उतरने लगा — आज, या कुछ दिनों से?`,
        Angry: `गुस्सा। ठीक है — बताओ। किस पर, या किस बात पर?`,
        Restless: `बेचैन। जैसे कुछ करना है पर समझ नहीं आ रहा क्या। जिन चीज़ों से बच रहे हो, उनमें सबसे पास वाली क्या है?`,
        Okay: `ठीक-ठाक होना भी अच्छा है, सच में। आज तुम्हारा ध्यान किस पर रहा?`,
        Hopeful: `उम्मीद — सुनकर अच्छा लगा। क्या बदला?`,
      },
      other: `तुमने “{label}” कहा। उसके बारे में बताओ।`,
      note: ` तुमने “{note}” भी कहा — जहाँ से चाहो, शुरू करो।`,
    },
    te: {
      base: `హాయ్ ${name}. నేను MindEase — సాఫ్ట్‌వేర్, ఒకసారి చెప్పేస్తున్నా. ఈ రోజు ఎలా గడిచింది?`,
      by: {
        Heavy: `బరువుగా ఉంది, సరే. ఇప్పుడే వివరించక్కర్లేదు — ఇప్పుడు అన్నిటికంటే బరువైనది ఏది?`,
        Anxious: `ఆందోళన. సరే, కొంచెం నెమ్మదిగా వెళ్దాం. నీ మనసు మళ్ళీ మళ్ళీ దేని దగ్గరకి వెళ్తోంది?`,
        Lonely: `ఒంటరితనం. దానితో కూర్చోకుండా ఇక్కడికి వచ్చావు, మంచిది. చెప్పగలిగితే ఎవరికి చెప్పేవాడివి?`,
        Numb: `మొద్దుబారడం నిజమే, చెప్పడం కష్టం. రంగు పోవడం ఎప్పుడు మొదలైంది — ఈ రోజా, కొన్ని రోజులుగానా?`,
        Angry: `కోపం. సరే — చెప్పు. ఎవరి మీద, లేదా దేని మీద?`,
        Restless: `అశాంతి. ఏదో చేయాలి కానీ ఏంటో తెలియనట్టు. నువ్వు తప్పించుకుంటున్న దగ్గరి పని ఏది?`,
        Okay: `బాగానే ఉండటం నిజంగా మంచిదే. ఈ రోజు నీ దృష్టి దేని మీద ఉంది?`,
        Hopeful: `ఆశ — వినడానికి బాగుంది. ఏం మారింది?`,
      },
      other: `“{label}” అన్నావు. దాని గురించి చెప్పు.`,
      note: ` “{note}” అని కూడా అన్నావు — ఎక్కడి నుంచైనా మొదలుపెట్టు.`,
    },
    kn: {
      base: `ನಮಸ್ಕಾರ ${name}. ನಾನು MindEase — ಸಾಫ್ಟ್‌ವೇರ್, ಒಮ್ಮೆ ಹೇಳಿಬಿಡುತ್ತೇನೆ. ಇವತ್ತು ಹೇಗಿತ್ತು?`,
      by: {
        Heavy: `ಭಾರವಾಗಿದೆ, ಸರಿ. ಈಗಲೇ ವಿವರಿಸಬೇಕಿಲ್ಲ — ಈಗ ಅತಿ ಭಾರವಾದದ್ದು ಯಾವುದು?`,
        Anxious: `ಆತಂಕ. ಸರಿ, ಸ್ವಲ್ಪ ನಿಧಾನ ಮಾಡೋಣ. ನಿನ್ನ ಮನಸ್ಸು ಮತ್ತೆ ಮತ್ತೆ ಯಾವುದರ ಕಡೆ ಹೋಗುತ್ತಿದೆ?`,
        Lonely: `ಒಂಟಿತನ. ಅದರೊಂದಿಗೆ ಕೂರದೆ ಇಲ್ಲಿ ಬಂದದ್ದು ಒಳ್ಳೆಯದು. ಹೇಳಲು ಆಗಿದ್ದರೆ ಯಾರಿಗೆ ಹೇಳುತ್ತಿದ್ದೆ?`,
        Numb: `ಮರಗಟ್ಟುವಿಕೆ ನಿಜ, ವಿವರಿಸಲು ಕಷ್ಟ. ಬಣ್ಣ ಹೋಗಲು ಶುರುವಾದದ್ದು ಯಾವಾಗ — ಇವತ್ತೋ, ಕೆಲವು ದಿನಗಳಿಂದಲೋ?`,
        Angry: `ಕೋಪ. ಸರಿ — ಹೇಳು. ಯಾರ ಮೇಲೆ, ಅಥವಾ ಯಾವುದರ ಮೇಲೆ?`,
        Restless: `ಚಡಪಡಿಕೆ. ಏನೋ ಮಾಡಬೇಕು ಆದರೆ ಏನೆಂದು ಗೊತ್ತಿಲ್ಲದ ಹಾಗೆ. ನೀನು ತಪ್ಪಿಸುತ್ತಿರುವ ಹತ್ತಿರದ ಕೆಲಸ ಯಾವುದು?`,
        Okay: `ಪರವಾಗಿಲ್ಲ ಅನ್ನೋದು ನಿಜಕ್ಕೂ ಒಳ್ಳೆಯದೇ. ಇವತ್ತು ನಿನ್ನ ಗಮನ ಯಾವುದರ ಮೇಲಿತ್ತು?`,
        Hopeful: `ಭರವಸೆ — ಕೇಳಲು ಚೆನ್ನಾಗಿದೆ. ಏನು ಬದಲಾಯಿತು?`,
      },
      other: `“{label}” ಅಂದೆ. ಅದರ ಬಗ್ಗೆ ಹೇಳು.`,
      note: ` “{note}” ಅಂತಲೂ ಹೇಳಿದೆ — ಎಲ್ಲಿಂದ ಬೇಕಾದರೂ ಶುರು ಮಾಡು.`,
    },
    ml: {
      base: `ഹായ് ${name}. ഞാൻ MindEase — സോഫ്റ്റ്‌വെയർ ആണ്, ഒരു തവണ പറഞ്ഞു വയ്ക്കുന്നു. ഇന്ന് എങ്ങനെയായിരുന്നു?`,
      by: {
        Heavy: `ഭാരമായി തോന്നുന്നു, ശരി. ഇപ്പോൾ വിശദീകരിക്കണ്ട — ഇപ്പോൾ ഏറ്റവും ഭാരമുള്ളത് എന്താണ്?`,
        Anxious: `ഉത്കണ്ഠ. ശരി, കുറച്ച് പതുക്കെ പോകാം. നിന്റെ മനസ്സ് വീണ്ടും വീണ്ടും എന്തിലേക്കാണ് പോകുന്നത്?`,
        Lonely: `ഏകാന്തത. അതുമായി ഇരിക്കാതെ ഇവിടെ വന്നത് നന്നായി. പറയാൻ കഴിഞ്ഞിരുന്നെങ്കിൽ ആരോട് പറയുമായിരുന്നു?`,
        Numb: `മരവിപ്പ് യഥാർത്ഥമാണ്, വിവരിക്കാൻ പ്രയാസവും. നിറം പോകാൻ തുടങ്ങിയത് എപ്പോഴാണ് — ഇന്നോ, കുറച്ചു ദിവസങ്ങളായോ?`,
        Angry: `ദേഷ്യം. ശരി — പറയൂ. ആരോട്, അല്ലെങ്കിൽ എന്തിനോട്?`,
        Restless: `അസ്വസ്ഥത. എന്തോ ചെയ്യണം, പക്ഷേ എന്തെന്നറിയില്ല എന്നപോലെ. നീ ഒഴിവാക്കിക്കൊണ്ടിരിക്കുന്ന ഏറ്റവും അടുത്ത കാര്യം എന്താണ്?`,
        Okay: `കുഴപ്പമില്ല എന്നത് ശരിക്കും നല്ലതാണ്. ഇന്ന് നിന്റെ ശ്രദ്ധ എന്തിലായിരുന്നു?`,
        Hopeful: `പ്രതീക്ഷ — കേൾക്കാൻ നല്ലതാണ്. എന്താണ് മാറിയത്?`,
      },
      other: `“{label}” എന്ന് പറഞ്ഞു. അതിനെക്കുറിച്ച് പറയൂ.`,
      note: ` “{note}” എന്നും പറഞ്ഞു — എവിടെ നിന്ന് വേണമെങ്കിലും തുടങ്ങാം.`,
    },
  };
  const g = G[ui] ?? G.en!;
  if (!arrival) return g.base;
  const line = g.by[arrival.label] ?? g.other.replace("{label}", arrival.label);
  return arrival.note ? line + g.note.replace("{note}", arrival.note) : line;
}
