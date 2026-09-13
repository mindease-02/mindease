"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { NEARBY_HELP_URL } from "@/lib/safety/resources";

interface Place { name: string; address: string; phone: string | null; lat: number; lng: number; distanceKm: number; mapsUrl: string; openNow: boolean | null; kind: string }

/**
 * "Find help near me". Location is asked for only when the person taps, is
 * used for one lookup, and is dropped when this component goes away. If the
 * lookup is unavailable or finds nothing, the maps search link and the
 * helplines above remain; nothing is invented.
 */
export default function NearbyHelp({ lang }: { lang: string }) {
  const [phase, setPhase] = useState<"idle" | "locating" | "searching" | "done" | "denied" | "fallback">("idle");
  const [places, setPlaces] = useState<Place[]>([]);

  function find() {
    if (!("geolocation" in navigator)) { setPhase("fallback"); return; }
    setPhase("locating");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      setPhase("searching");
      try {
        const r = await fetch("/api/nearby", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, lang }), cache: "no-store" });
        const j = await r.json();
        const list = Array.isArray(j.results) ? (j.results as Place[]) : [];
        setPlaces(list); setPhase(list.length ? "done" : "fallback");
      } catch { setPhase("fallback"); }
    }, () => setPhase("denied"), { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 });
  }

  return (
    <div className="nearby">
      {phase === "idle" && <button type="button" className="crisis-btn" onClick={find}>{t("nearFind", lang)}</button>}
      {phase === "idle" && <p className="crisis-small">{t("nearPrivacy", lang)}</p>}
      {(phase === "locating" || phase === "searching") && <p className="crisis-small" aria-live="polite">{phase === "locating" ? t("nearLocating", lang) : t("nearSearching", lang)}</p>}
      {phase === "done" && (
        <ul className="nearby-list">
          {places.map((p) => (
            <li key={p.name + p.address}>
              <div className="nearby-name"><b>{p.name}</b><span>{p.distanceKm} km{p.openNow === true ? `, ${t("nearOpen", lang)}` : ""}</span></div>
              <div className="nearby-addr">{p.address}</div>
              <div className="nearby-actions">
                {p.phone && <a className="crisis-call" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>{t("nearCall", lang)} {p.phone}</a>}
                <a className="crisis-link" href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">{t("nearGo", lang)}</a>
              </div>
            </li>
          ))}
          <li className="crisis-small">{t("nearSource", lang)}</li>
        </ul>
      )}
      {(phase === "fallback" || phase === "denied") && (
        <p className="crisis-small" aria-live="polite">
          {phase === "denied" ? t("nearDenied", lang) : t("nearNone", lang)}{" "}
          <a className="crisis-link" href={NEARBY_HELP_URL} target="_blank" rel="noreferrer">{t("nearMaps", lang)}</a>
        </p>
      )}
    </div>
  );
}
