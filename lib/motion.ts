"use client";
/**
 * Anime.js (v4) helpers. Every entrance, hover, press, text reveal and
 * scroll-driven movement on the site goes through here so timing and easing
 * are consistent. Continuous loops (ticker, grain, the balls breathing) stay
 * in CSS, where a compositor loop is cheaper than a JS one.
 *
 * Reduced motion: every helper short-circuits to the final state.
 */
import { animate, createTimeline, onScroll, stagger, createSpring, utils, type JSAnimation } from "animejs";

export const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "outExpo";

/** Fade + rise into place. */
export function revealIn(targets: Element | Element[] | NodeListOf<Element>, opts: { delay?: number; y?: number; duration?: number } = {}) {
  const list = Array.from(targets instanceof Element ? [targets] : targets) as HTMLElement[];
  if (!list.length) return;
  if (reduced()) { list.forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; }); return; }
  return animate(list, { opacity: [0, 1], translateY: [opts.y ?? 28, 0], duration: opts.duration ?? 1000, delay: opts.delay ?? 0, ease: EASE });
}

/** Word-by-word text reveal: the inner spans slide up out of their clipping wrappers. */
export function wordsIn(spans: NodeListOf<Element> | Element[], delay = 0, step = 55) {
  const list = Array.from(spans) as HTMLElement[];
  if (!list.length) return;
  if (reduced()) { list.forEach((el) => { el.style.transform = "none"; }); return; }
  return animate(list, { translateY: ["110%", "0%"], duration: 1100, delay: stagger(step, { start: delay }), ease: EASE });
}

/** Message / card pop: scale up from slightly below. */
export function popIn(el: Element | null, delay = 0) {
  if (!el) return;
  if (reduced()) { (el as HTMLElement).style.opacity = "1"; return; }
  return animate(el, { opacity: [0, 1], translateY: [10, 0], scale: [0.98, 1], duration: 520, delay, ease: EASE });
}

/** Hover lift + press squash on any card or button. Returns an unbind function. */
export function bindLift(el: HTMLElement, opts: { lift?: number; rotateTo?: number | null; scale?: number } = {}) {
  const lift = opts.lift ?? -4, scale = opts.scale ?? 1;
  const enter = () => { if (reduced()) return; animate(el, { translateY: lift, scale, ...(opts.rotateTo !== undefined && opts.rotateTo !== null ? { rotate: opts.rotateTo } : {}), duration: 450, ease: EASE }); };
  const leave = () => { if (reduced()) return; animate(el, { translateY: 0, scale: 1, ...(opts.rotateTo !== undefined && opts.rotateTo !== null ? { rotate: Number(el.dataset.rot ?? 0) } : {}), duration: 600, ease: createSpring({ stiffness: 120, damping: 14 }) }); };
  const down = () => { if (reduced()) return; animate(el, { scale: 0.97, duration: 120, ease: "outQuad" }); };
  const up = () => { if (reduced()) return; animate(el, { scale: 1, duration: 500, ease: createSpring({ stiffness: 200, damping: 12 }) }); };
  el.addEventListener("mouseenter", enter); el.addEventListener("mouseleave", leave);
  el.addEventListener("pointerdown", down); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  return () => { el.removeEventListener("mouseenter", enter); el.removeEventListener("mouseleave", leave); el.removeEventListener("pointerdown", down); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
}

/** Magnetic pull toward the cursor, spring back on leave. */
export function bindMagnetic(el: HTMLElement, strength = 10) {
  let current: JSAnimation | null = null;
  const move = (e: MouseEvent) => {
    if (reduced()) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - (r.left + r.width / 2)) / r.width) * strength, y = ((e.clientY - (r.top + r.height / 2)) / r.height) * strength;
    current?.pause();
    current = animate(el, { translateX: x, translateY: y, duration: 250, ease: "outQuad" });
  };
  const leave = () => { if (reduced()) return; current?.pause(); current = animate(el, { translateX: 0, translateY: 0, duration: 700, ease: createSpring({ stiffness: 150, damping: 12 }) }); };
  el.addEventListener("mousemove", move); el.addEventListener("mouseleave", leave);
  return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
}

/** Scroll-synced parallax: moves `el` between from→to px while `track` crosses the viewport. */
export function bindParallax(el: HTMLElement, track: HTMLElement, from: number, to: number) {
  if (reduced()) return () => {};
  const anim = animate(el, { translateY: [from, to], ease: "linear", autoplay: onScroll({ target: track, enter: "bottom top", leave: "top bottom", sync: true }) });
  return () => { anim.pause(); utils.remove(el); };
}

/** Page settle on entry: a slow push-in from slightly larger, plus fade. */
export function enterPage(root: HTMLElement) {
  if (reduced()) { root.style.opacity = "1"; root.style.transform = "none"; return; }
  return animate(root, { opacity: [0, 1], scale: [1.035, 1], duration: 1500, ease: EASE });
}

/** Hero opening: one timeline so the eyebrow, words, lede, buttons, stage and stickers land in order. */
export function heroTimeline(parts: { eyebrow?: Element | null; words: NodeListOf<Element>; lede?: Element | null; ctas?: Element | null; stage?: Element | null; cards: NodeListOf<Element> | Element[] }) {
  const finish = () => { [parts.eyebrow, parts.lede, parts.ctas, parts.stage, ...Array.from(parts.cards)].forEach((el) => { if (el) { (el as HTMLElement).style.opacity = "1"; (el as HTMLElement).style.transform = "none"; } }); Array.from(parts.words).forEach((w) => { (w as HTMLElement).style.transform = "none"; }); };
  if (reduced()) { finish(); return; }
  const tl = createTimeline({ defaults: { ease: EASE } });
  if (parts.eyebrow) tl.add(parts.eyebrow, { opacity: [0, 1], translateY: [16, 0], duration: 700 }, 0);
  tl.add(Array.from(parts.words), { translateY: ["110%", "0%"], duration: 1100, delay: stagger(60) }, 120);
  if (parts.lede) tl.add(parts.lede, { opacity: [0, 1], translateY: [24, 0], duration: 900 }, 520);
  if (parts.ctas) tl.add(parts.ctas, { opacity: [0, 1], translateY: [24, 0], duration: 900 }, 680);
  if (parts.stage) tl.add(parts.stage, { opacity: [0, 1], translateY: [40, 0], scale: [0.96, 1], duration: 1300 }, 300);
  const cards = Array.from(parts.cards) as HTMLElement[];
  cards.forEach((el, i) => { const rot = Number(el.dataset.rot ?? 0); tl.add(el, { opacity: [0, 1], scale: [0.6, 1], rotate: [rot - 12, rot], duration: 900, ease: createSpring({ stiffness: 110, damping: 12 }) }, 900 + i * 110); });
  return tl;
}
