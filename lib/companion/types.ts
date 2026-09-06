/**
 * Companion Mode: the shapes shared by the server, the store and the UI.
 *
 * A companion is a named, customised face on the same MindEase pipeline. It
 * borrows the persona's safety core (honesty about being software, cognitive
 * empathy, the three tiers of care, the reliance countermeasures) and layers a
 * chosen name, look, voice and style on top. Nothing here bypasses the risk
 * gate or the dependency index - those run on every companion turn exactly as
 * they do in the main chat.
 */

export type Pronouns = "she" | "he" | "they";

/** Seven sliders, each 0..1 from the left label to the right label. */
export interface PersonalityConfig {
  /** calm 0 ↔ energetic 1 */
  energy: number;
  /** serious 0 ↔ playful 1 */
  playful: number;
  /** quiet 0 ↔ talkative 1 */
  talkative: number;
  /** logical 0 ↔ emotional 1 */
  emotional: number;
  /** reserved 0 ↔ expressive 1 */
  expressive: number;
  /** direct 0 ↔ gentle 1 */
  gentle: number;
  /** serious 0 ↔ funny 1 */
  funny: number;
}

export type ReplyLength = "short" | "normal" | "long";
export type QuestionStyle = "lots" | "balanced" | "listening";
export type EmojiLevel = "none" | "some" | "lots";

export interface ConversationConfig {
  length: ReplyLength;
  questions: QuestionStyle;
  /** Lowercase, texting-style punctuation. */
  casual: boolean;
  /** More reactions and colour in the wording. */
  expressive: boolean;
  emojis: EmojiLevel;
}

export type AddressMode = "first" | "nickname" | "custom" | "none";

export interface AddressConfig {
  mode: AddressMode;
  /** For "nickname" (chosen from suggestions) and "custom" (typed). */
  nickname?: string;
}

export interface VoiceConfig {
  /** Id from the voice catalogue (lib/companion/voices.ts). */
  voiceId: string;
  /** 0.7 .. 1.3 */
  speed: number;
  /** 0 .. 1 - maps to expressiveness/stability on the provider. */
  energy: number;
  /** 0 .. 1 */
  volume: number;
  /** Read replies aloud without pressing play. */
  autoplay: boolean;
}

export type RelationshipStyle = "friend" | "study" | "creative" | "gaming" | "listener" | "motivator";

export interface AppearanceConfig {
  /** Registry id. */
  avatarId: string;
  /** Style variant supported by the avatar (see AvatarDefinition.styles). */
  style: string;
  /** Stage background key (see BACKGROUNDS). */
  background: string;
  /** How much the avatar moves. */
  animation: "low" | "normal" | "high";
}

export interface PrivacyConfig {
  /** Keep the companion transcript between sessions. Off => nothing is written to companion_messages. */
  storeHistory: boolean;
  /** Let the companion keep memories at all. Off => extraction is skipped. */
  remember: boolean;
}

export interface CompanionProfile {
  id: string;
  userId: string;
  name: string;
  pronouns: Pronouns;
  /** Null = not asked / declined. True keeps the companion firmly in buddy mode. */
  minor: boolean | null;
  appearance: AppearanceConfig;
  personality: PersonalityConfig;
  conversation: ConversationConfig;
  address: AddressConfig;
  voice: VoiceConfig;
  relationship: RelationshipStyle;
  privacy: PrivacyConfig;
  /** Free-text interests seeded from the avatar and editable by the person. */
  interests: string[];
  /** Set once the intro animation has played. */
  introduced: boolean;
  createdAt: number;
  updatedAt: number;
}

/** What the person can change; the server fills in ids and timestamps. */
export type CompanionSettings = Omit<CompanionProfile, "id" | "userId" | "createdAt" | "updatedAt">;

export interface CompanionMemory {
  id: string;
  userId: string;
  companionId: string;
  memory: string;
  kind: string;
  importance: number;
  createdAt: number;
  updatedAt: number;
}

export interface CompanionMessage {
  id?: string;
  userId: string;
  companionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** Unprompted check-in. */
  proactive?: boolean;
  kind?: string;
}

/** Facial expressions the avatar system can render. */
export type Expression = "neutral" | "happy" | "curious" | "thoughtful" | "concerned" | "excited" | "calm" | "surprised";

export const EXPRESSIONS: Expression[] = ["neutral", "happy", "curious", "thoughtful", "concerned", "excited", "calm", "surprised"];

export const RELATIONSHIPS: { id: RelationshipStyle; label: string; blurb: string }[] = [
  { id: "friend", label: "Supportive friend", blurb: "Here for the day-to-day. Listens, reacts, remembers." },
  { id: "study", label: "Study buddy", blurb: "Keeps you company while you work, checks in on the plan." },
  { id: "creative", label: "Creative buddy", blurb: "Bounces ideas, asks what you're making, gets curious." },
  { id: "gaming", label: "Gaming buddy", blurb: "Talks games, wins, losses and the people you play with." },
  { id: "listener", label: "Listener", blurb: "Mostly quiet. Says less, asks less, stays with you." },
  { id: "motivator", label: "Motivator", blurb: "Nudges you toward the next small thing. Warm, not pushy." },
];

export const BACKGROUNDS: { id: string; label: string }[] = [
  { id: "ember", label: "Ember" },
  { id: "dusk", label: "Dusk" },
  { id: "night", label: "Night" },
  { id: "mist", label: "Mist" },
];
