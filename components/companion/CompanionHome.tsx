"use client";
/** "Meet your companion." The landing screen inside the signed-in app. */
import { useMemo, useState } from "react";
import { avatarById, resolveLook } from "@/lib/companion/avatars";
import type { CompanionProfile, Expression } from "@/lib/companion/types";
import { PxArrow, PxBrain, PxCog, PxUser } from "../home/pixelIcons";
import Avatar from "./Avatar";

export default function CompanionHome({ profile }: { profile: CompanionProfile }) {
  const avatar = avatarById(profile.appearance.avatarId);
  const look = useMemo(() => resolveLook(avatar, profile.appearance.style), [avatar, profile.appearance.style]);
  const [expr, setExpr] = useState<Expression>("calm");
  return (
    <div className={`cmp-home cmp-bg-${profile.appearance.background}`}>
      <div className="cmp-stage-ring" aria-hidden />
      <div className="cmp-particles" aria-hidden>{Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
      <div className="cmp-home-face" onPointerEnter={() => setExpr("happy")} onPointerLeave={() => setExpr("calm")}>
        <Avatar look={look} expression={expr} intensity={profile.appearance.animation} intro />
      </div>
      <h1 className="display cmp-home-title">Meet your companion.</h1>
      <p className="cmp-home-sub">Someone to talk to, think with, and check in with.</p>
      <p className="cmp-home-name"><b>{profile.name}</b> · {avatar.tagline}</p>
      <div className="cmp-home-actions">
        <a href="/companion/chat" className="btn btn-primary">Start talking <PxArrow className="pxicon" /></a>
        <a href="/companion/setup?edit=1" className="btn"><PxUser className="pxicon" /> Customize</a>
        <a href="/companion/memory" className="btn"><PxBrain className="pxicon" /> Memory</a>
        <a href="/companion/settings" className="btn"><PxCog className="pxicon" /> Settings</a>
      </div>
      <p className="muted cmp-note">You control what your companion remembers. <a href="/chat">Back to the main chat</a>.</p>
    </div>
  );
}
