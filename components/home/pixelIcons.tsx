/**
 * Icon set: Lucide (ISC), thin strokes, sized to the text by default. The
 * component names are kept from the earlier pixel set so call sites are unchanged.
 */
import type { LucideProps } from "lucide-react";
import {
  Gamepad2, ArrowRight, Bell, Trash2, Brain, Check, Settings, Download, Eye, Zap, Hand, Heart, Hourglass, Lock, Menu,
  MessageCircle, Mic, MicOff, Aperture, Moon, Play, RefreshCw, X, Satellite, Send, Shield, Volume2, Star, Sun, User, Minus,
} from "lucide-react";

type P = LucideProps;
const base: P = { size: "1em", strokeWidth: 1.75, "aria-hidden": true };

export const PxArcade = (p: P) => <Gamepad2 {...base} {...p} />;
export const PxArrow = (p: P) => <ArrowRight {...base} {...p} />;
export const PxBell = (p: P) => <Bell {...base} {...p} />;
export const PxBin = (p: P) => <Trash2 {...base} {...p} />;
export const PxBrain = (p: P) => <Brain {...base} {...p} />;
export const PxCheck = (p: P) => <Check {...base} {...p} />;
export const PxCog = (p: P) => <Settings {...base} {...p} />;
export const PxDownload = (p: P) => <Download {...base} {...p} />;
export const PxEye = (p: P) => <Eye {...base} {...p} />;
export const PxFlash = (p: P) => <Zap {...base} {...p} />;
export const PxHand = (p: P) => <Hand {...base} {...p} />;
export const PxHeart = (p: P) => <Heart {...base} {...p} />;
export const PxHourglass = (p: P) => <Hourglass {...base} {...p} />;
export const PxLock = (p: P) => <Lock {...base} {...p} />;
export const PxMenu = (p: P) => <Menu {...base} {...p} />;
export const PxMessage = (p: P) => <MessageCircle {...base} {...p} />;
export const PxMic = (p: P) => <Mic {...base} {...p} />;
export const PxMicoff = (p: P) => <MicOff {...base} {...p} />;
export const PxMirror = (p: P) => <Aperture {...base} {...p} />;
export const PxMoon = (p: P) => <Moon {...base} {...p} />;
export const PxPlay = (p: P) => <Play {...base} {...p} />;
export const PxRefresh = (p: P) => <RefreshCw {...base} {...p} />;
export const PxRemove = (p: P) => <X {...base} {...p} />;
export const PxSatellite = (p: P) => <Satellite {...base} {...p} />;
export const PxSend = (p: P) => <Send {...base} {...p} />;
export const PxShield = (p: P) => <Shield {...base} {...p} />;
export const PxSound = (p: P) => <Volume2 {...base} {...p} />;
export const PxStar = (p: P) => <Star {...base} {...p} />;
export const PxSun = (p: P) => <Sun {...base} {...p} />;
export const PxUser = (p: P) => <User {...base} {...p} />;
export const PxMinus = (p: P) => <Minus {...base} {...p} />;
