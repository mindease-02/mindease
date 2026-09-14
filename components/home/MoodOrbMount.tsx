"use client";
import dynamic from "next/dynamic";

/** The 3D mood ball loads only in the browser. */
const MoodOrb = dynamic(() => import("./MoodOrb"), { ssr: false });
export default function MoodOrbMount({ lang }: { lang: string }) { return <MoodOrb lang={lang} />; }
