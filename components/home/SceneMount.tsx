"use client";
import dynamic from "next/dynamic";

/** The 3D scene loads only in the browser and only on the landing page. */
const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });
export default function SceneMount() { return <Scene3D />; }
