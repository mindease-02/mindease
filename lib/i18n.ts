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

type UI = "en" | "ta" | "hi";
export function uiLang(id: string | undefined): UI {
  return id === "ta" || id === "hi" ? id : "en";
}

const STR: Record<string, Record<UI, string>> = {
  software: { en: "software", ta: "மென்பொருள்", hi: "सॉफ़्टवेयर" },
  hereFor: { en: "here for {name}", ta: "{name}க்காக இங்கே", hi: "{name} के लिए यहाँ" },
  changeMood: { en: "change mood", ta: "மனநிலையை மாற்று", hi: "मूड बदलें" },
  voiceOn: { en: "voice on", ta: "குரல்: ஆன்", hi: "आवाज़: चालू" },
  voiceOff: { en: "voice off", ta: "குரல்: ஆஃப்", hi: "आवाज़: बंद" },
  voiceChat: { en: "Voice chat", ta: "குரல் உரையாடல்", hi: "वॉइस चैट" },
  endVoice: { en: "End voice chat", ta: "குரல் உரையாடலை முடி", hi: "वॉइस चैट बंद करें" },
  listening: { en: "listening…", ta: "கேட்கிறேன்…", hi: "सुन रहा हूँ…" },
  thinking: { en: "thinking…", ta: "யோசிக்கிறேன்…", hi: "सोच रहा हूँ…" },
  speaking: { en: "speaking…", ta: "பேசுகிறேன்…", hi: "बोल रहा हूँ…" },
  tapToTalk: { en: "tap the orb to talk", ta: "பேச ஓர்பைத் தட்டுங்கள்", hi: "बोलने के लिए ऑर्ब पर टैप करें" },
  mirror: { en: "Mirror", ta: "கண்ணாடி", hi: "आईना" },
  chats: { en: "Chats", ta: "உரையாடல்கள்", hi: "चैट्स" },
  newChat: { en: "New chat", ta: "புதிய உரையாடல்", hi: "नई चैट" },
  recent: { en: "Recent", ta: "சமீபத்தியவை", hi: "हाल की" },
  noChats: { en: "No saved chats yet.", ta: "சேமித்த உரையாடல்கள் இன்னும் இல்லை.", hi: "अभी कोई सहेजी हुई चैट नहीं।" },
  untitled: { en: "New conversation", ta: "புதிய உரையாடல்", hi: "नई बातचीत" },
  deleteChat: { en: "Delete this chat", ta: "இந்த உரையாடலை நீக்கு", hi: "यह चैट हटाएँ" },
  profile: { en: "Profile", ta: "சுயவிவரம்", hi: "प्रोफ़ाइल" },
  profileResults: { en: "Profile & results", ta: "சுயவிவரம் & முடிவுகள்", hi: "प्रोफ़ाइल और नतीजे" },
  summary: { en: "Printable summary", ta: "அச்சிடக்கூடிய சுருக்கம்", hi: "प्रिंट करने योग्य सारांश" },
  language: { en: "Language", ta: "மொழி", hi: "भाषा" },
  signOut: { en: "Sign out", ta: "வெளியேறு", hi: "साइन आउट" },
  send: { en: "Send", ta: "அனுப்பு", hi: "भेजें" },
  sayAnything: { en: "say anything", ta: "எதை வேண்டுமானாலும் சொல்லுங்கள்", hi: "कुछ भी कहो" },
  disclaimer: { en: "MindEase is software, not a therapist. In crisis, use a helpline.", ta: "MindEase ஒரு மென்பொருள், மனநல மருத்துவர் அல்ல. நெருக்கடியில் உதவி எண்ணை அழைக்கவும்.", hi: "MindEase एक सॉफ़्टवेयर है, थेरेपिस्ट नहीं। संकट में हेल्पलाइन पर कॉल करें।" },
  unprompted: { en: "unprompted", ta: "தானாக", hi: "बिना पूछे" },
  notUseful: { en: "this wasn't useful", ta: "இது பயனுள்ளதாக இல்லை", hi: "यह उपयोगी नहीं था" },
  micDenied: { en: "Microphone permission was refused.", ta: "மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது.", hi: "माइक्रोफ़ोन की अनुमति नहीं मिली।" },
  nothingHeard: { en: "Didn't catch anything.", ta: "எதுவும் கேட்கவில்லை.", hi: "कुछ सुनाई नहीं दिया।" },
  // mood page
  step2: { en: "Step 2 of 2 · how you're arriving", ta: "படி 2 / 2 · நீங்கள் எப்படி வருகிறீர்கள்", hi: "चरण 2 / 2 · आप कैसे आ रहे हैं" },
  arriving: { en: "How are you arriving, {name}?", ta: "{name}, எப்படி வந்திருக்கிறீர்கள்?", hi: "{name}, आज कैसे आए हो?" },
  arrivingSub: { en: "Tap one. It gives MindEase a sense of what to hold, and you can be wrong about it.", ta: "ஒன்றைத் தட்டுங்கள். எதைக் கவனிக்க வேண்டும் என்று MindEase-க்கு ஒரு உணர்வு தரும்; தவறாக இருந்தாலும் பரவாயில்லை.", hi: "एक चुनो। इससे MindEase को समझ आता है कि क्या संभालना है, और गलत होना भी ठीक है।" },
  ownWords: { en: "Or say it in your own words", ta: "அல்லது உங்கள் சொந்த வார்த்தைகளில் சொல்லுங்கள்", hi: "या अपने शब्दों में कहो" },
  ownWordsPh: { en: "e.g. exam on Monday and I can’t focus", ta: "உதா. திங்கள் தேர்வு, கவனம் செலுத்த முடியவில்லை", hi: "जैसे: सोमवार को परीक्षा है और ध्यान नहीं लग रहा" },
  openingChat: { en: "Opening the chat…", ta: "உரையாடல் திறக்கிறது…", hi: "चैट खुल रही है…" },
  skipToChat: { en: "Skip to chat", ta: "நேரடியாக உரையாடலுக்கு", hi: "सीधे चैट पर" },
  goToChat: { en: "Go to the chat", ta: "உரையாடலுக்குச் செல்", hi: "चैट पर जाएँ" },
  // profile page
  account: { en: "Account", ta: "கணக்கு", hi: "खाता" },
  name: { en: "Name", ta: "பெயர்", hi: "नाम" },
  username: { en: "Username (email)", ta: "பயனர்பெயர் (மின்னஞ்சல்)", hi: "यूज़रनेम (ईमेल)" },
  password: { en: "Password", ta: "கடவுச்சொல்", hi: "पासवर्ड" },
  changePassword: { en: "Change password", ta: "கடவுச்சொல்லை மாற்று", hi: "पासवर्ड बदलें" },
  newPassword: { en: "New password (8+ characters)", ta: "புதிய கடவுச்சொல் (8+ எழுத்துகள்)", hi: "नया पासवर्ड (8+ अक्षर)" },
  save: { en: "Save", ta: "சேமி", hi: "सहेजें" },
  saved: { en: "Saved.", ta: "சேமிக்கப்பட்டது.", hi: "सहेज लिया।" },
  memberSince: { en: "Member since", ta: "உறுப்பினர் ஆனது", hi: "सदस्य बने" },
  results: { en: "What MindEase has read", ta: "MindEase கவனித்தவை", hi: "MindEase ने क्या समझा" },
  howYouSeem: { en: "How you seem right now", ta: "இப்போது நீங்கள் எப்படித் தெரிகிறீர்கள்", hi: "अभी आप कैसे लगते हैं" },
  daysTalking: { en: "days of conversation", ta: "நாட்கள் உரையாடல்", hi: "दिन बातचीत" },
  memoriesKept: { en: "memories kept", ta: "நினைவுகள்", hi: "यादें" },
  screenings: { en: "Screening scores", ta: "பரிசோதனை மதிப்பெண்கள்", hi: "स्क्रीनिंग स्कोर" },
  noScreenings: { en: "No screenings yet. MindEase offers one when the pattern warrants it, or you can ask for one in the chat.", ta: "இன்னும் பரிசோதனைகள் இல்லை. தேவைப்படும்போது MindEase ஒன்றை வழங்கும்; உரையாடலில் நீங்களே கேட்கலாம்.", hi: "अभी कोई स्क्रीनिंग नहीं। ज़रूरत लगने पर MindEase खुद पेश करता है, या चैट में माँग सकते हैं।" },
  patterns: { en: "Patterns observed (last 14 days)", ta: "கவனிக்கப்பட்ட முறைகள் (கடந்த 14 நாட்கள்)", hi: "देखे गए पैटर्न (पिछले 14 दिन)" },
  noPatterns: { en: "Not enough recent conversation to say anything reliable.", ta: "நம்பகமாகச் சொல்ல போதுமான சமீபத்திய உரையாடல் இல்லை.", hi: "भरोसे से कुछ कहने के लिए हाल की बातचीत काफ़ी नहीं।" },
  rhythm: { en: "Daily rhythm", ta: "தினசரி தாளம்", hi: "रोज़ की लय" },
  notDiagnosis: { en: "Screening signals produced by software. Only a clinician can assess or diagnose.", ta: "மென்பொருள் உருவாக்கிய பரிசோதனைச் சமிக்ஞைகள். மருத்துவர் மட்டுமே மதிப்பிடவோ கண்டறியவோ முடியும்.", hi: "ये सॉफ़्टवेयर के स्क्रीनिंग संकेत हैं। आकलन या निदान केवल चिकित्सक कर सकते हैं।" },
  yourData: { en: "Your data", ta: "உங்கள் தரவு", hi: "आपका डेटा" },
  exportJson: { en: "Download everything (JSON)", ta: "எல்லாவற்றையும் பதிவிறக்கு (JSON)", hi: "सब कुछ डाउनलोड करें (JSON)" },
  deleteAll: { en: "Delete all conversations and memories", ta: "எல்லா உரையாடல்களையும் நினைவுகளையும் நீக்கு", hi: "सभी बातचीत और यादें हटाएँ" },
  deleteConfirm: { en: "Delete everything MindEase holds about you? This cannot be undone.", ta: "MindEase வைத்திருக்கும் உங்கள் எல்லாவற்றையும் நீக்கவா? இதை மீட்க முடியாது.", hi: "MindEase के पास आपका सब कुछ हटा दें? इसे वापस नहीं किया जा सकता।" },
  backToChat: { en: "Back to chat", ta: "உரையாடலுக்குத் திரும்பு", hi: "चैट पर वापस" },
  languageHint: { en: "MindEase replies in this language. Auto follows whatever you write in.", ta: "MindEase இந்த மொழியில் பதிலளிக்கும். Auto என்றால் நீங்கள் எழுதும் மொழியைப் பின்பற்றும்.", hi: "MindEase इसी भाषा में जवाब देगा। Auto में आप जिसमें लिखें, उसी में।" },
  uiNote: { en: "", ta: "", hi: "" },
};

export function t(key: string, lang: string | undefined, vars: Record<string, string> = {}): string {
  const ui = uiLang(lang);
  const row = STR[key];
  let s = row ? (row[ui] || row.en) : key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

/** Mood tile labels and hints, keyed by palette id. */
const MOOD_T: Record<string, Record<UI, [string, string]>> = {
  okay: { en: ["Okay", "fine, actually — just here"], ta: ["பரவாயில்லை", "நல்லா தான் இருக்கேன் — சும்மா வந்தேன்"], hi: ["ठीक-ठाक", "ठीक ही हूँ — बस यहाँ हूँ"] },
  hopeful: { en: ["Hopeful", "something's lifting"], ta: ["நம்பிக்கை", "ஏதோ லேசாகிறது"], hi: ["उम्मीद", "कुछ हल्का हो रहा है"] },
  heavy: { en: ["Heavy", "low, flat, hard to move"], ta: ["கனம்", "தாழ்வாக, சோர்வாக, அசைய முடியாமல்"], hi: ["भारी", "उदास, सपाट, हिलना मुश्किल"] },
  lonely: { en: ["Lonely", "nobody to tell"], ta: ["தனிமை", "சொல்ல யாரும் இல்லை"], hi: ["अकेला", "कहने को कोई नहीं"] },
  anxious: { en: ["Anxious", "wired, braced, can't settle"], ta: ["பதற்றம்", "பதற்றமாக, இறுக்கமாக, அமைதியில்லாமல்"], hi: ["चिंतित", "तना हुआ, बेचैन, ठहर नहीं पा रहा"] },
  angry: { en: ["Angry", "at someone, or everything"], ta: ["கோபம்", "யார் மேலோ, எல்லாவற்றின் மேலோ"], hi: ["गुस्सा", "किसी पर, या सब पर"] },
  restless: { en: ["Restless", "need to do something, unsure what"], ta: ["அமைதியின்மை", "ஏதோ செய்யணும், என்னன்னு தெரியல"], hi: ["बेचैन", "कुछ करना है, पर क्या—पता नहीं"] },
  numb: { en: ["Numb", "not much of anything"], ta: ["உணர்வின்மை", "எதுவுமே பெரிதாக இல்லை"], hi: ["सुन्न", "कुछ भी खास महसूस नहीं"] },
};
export function moodText(id: string, lang: string | undefined): [string, string] | null {
  const row = MOOD_T[id]; if (!row) return null;
  return row[uiLang(lang)] ?? row.en;
}

/** The opening line of a chat, keyed by the arrival mood label (English palette label). */
export function greetingFor(name: string, arrival: { label: string; note?: string } | null, lang: string | undefined): string {
  const ui = uiLang(lang);
  const G: Record<UI, { base: string; by: Record<string, string>; other: string; note: string }> = {
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
  };
  const g = G[ui];
  if (!arrival) return g.base;
  const line = g.by[arrival.label] ?? g.other.replace("{label}", arrival.label);
  return arrival.note ? line + g.note.replace("{note}", arrival.note) : line;
}
