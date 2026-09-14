"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { NEARBY_HELP_URL } from "@/lib/safety/resources";
import { HOSPITALS, STATES, TELEMANAS_CELLS, inState, nearest, type Hospital } from "@/lib/safety/hospitals";

interface Place { name: string; address: string; phone: string | null; lat: number; lng: number; distanceKm: number; mapsUrl: string; openNow: boolean | null; kind: string }
type Row = { key: string; name: string; sub: string; address: string; tel: string | null; telDisplay: string | null; dirUrl: string; verified: boolean };

const rowFromHospital = (h: Hospital & { distanceKm?: number }): Row => ({
  key: h.name + h.city, name: h.name, sub: [h.city, h.distanceKm !== undefined ? `${h.distanceKm} km` : null, h.emergency24 ? "24h" : null].filter(Boolean).join(", "),
  address: h.address, tel: h.phone || null, telDisplay: h.phoneDisplay || null, dirUrl: `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`, verified: true,
});
const rowFromPlace = (p: Place): Row => ({
  key: p.name + p.address, name: p.name, sub: `${p.distanceKm} km${p.openNow === true ? ", open" : ""}`, address: p.address,
  tel: p.phone ? p.phone.replace(/[^\d+]/g, "") : null, telDisplay: p.phone, dirUrl: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, verified: false,
});

/**
 * "Find help near me". Location is asked for only when the person taps, is
 * used once, and is dropped when this component goes away. The nearest
 * hospitals come from a list checked against each institution's own site;
 * live map results are added above them only when a Places key is set. If
 * the person would rather not share location, they pick a state instead.
 * Nothing is ever invented; the maps link and the helplines always remain.
 */
export default function NearbyHelp({ lang }: { lang: string }) {
  const [phase, setPhase] = useState<"idle" | "locating" | "searching" | "done" | "state">("idle");
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState("");
  const [nothingNear, setNothingNear] = useState(false);

  async function find() {
    if (!("geolocation" in navigator)) { setPhase("state"); return; }
    setPhase("locating");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      setPhase("searching");
      const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const curated = nearest(at).map(rowFromHospital);
      let live: Row[] = [];
      try {
        const r = await fetch("/api/nearby", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...at, lang }), cache: "no-store" });
        const j = await r.json();
        if (Array.isArray(j.results)) live = (j.results as Place[]).slice(0, 3).map(rowFromPlace);
      } catch { /* the checked list still stands */ }
      const all = [...live, ...curated];
      setRows(all); setNothingNear(all.length === 0); setPhase(all.length ? "done" : "state");
    }, () => setPhase("state"), { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 });
  }
  function pickState(code: string) {
    setState(code); setRows(inState(code).map(rowFromHospital)); setNothingNear(false);
  }

  const states = Object.keys(STATES).filter((c) => HOSPITALS.some((h) => h.state === c) || TELEMANAS_CELLS[c]).sort((a, b) => STATES[a].localeCompare(STATES[b]));
  // A state's Tele-MANAS cell, minus any that is already listed above as a hospital.
  const listed = rows.map((r) => r.name.toLowerCase());
  const cells = state ? (TELEMANAS_CELLS[state] ?? []).filter((c) => !listed.some((n) => n.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(n))) : [];
  return (
    <div className="nearby">
      {phase === "idle" && <><button type="button" className="crisis-btn" onClick={find}>{t("nearFind", lang)}</button><p className="crisis-small">{t("nearPrivacy", lang)} <button type="button" className="crisis-link" onClick={() => setPhase("state")}>{t("nearByState", lang)}</button></p></>}
      {(phase === "locating" || phase === "searching") && <p className="crisis-small" aria-live="polite">{phase === "locating" ? t("nearLocating", lang) : t("nearSearching", lang)}</p>}
      {(phase === "state" || (phase === "done" && state)) && (
        <label className="nearby-state">
          <span>{nothingNear ? t("nearNone", lang) + " " : ""}{t("nearPickState", lang)}</span>
          <select className="field" value={state} onChange={(e) => pickState(e.target.value)}>
            <option value="">{t("nearChoose", lang)}</option>
            {states.map((c) => <option key={c} value={c}>{STATES[c]}</option>)}
          </select>
        </label>
      )}
      {rows.length > 0 && (
        <ul className="nearby-list" aria-live="polite">
          {rows.map((p) => (
            <li key={p.key}>
              <div className="nearby-name"><b>{p.name}</b><span>{p.sub}</span></div>
              <div className="nearby-addr">{p.address}</div>
              <div className="nearby-actions">
                {p.tel && <a className="crisis-call" href={`tel:${p.tel}`}>{t("nearCall", lang)} {p.telDisplay}</a>}
                <a className="crisis-link" href={p.dirUrl} target="_blank" rel="noreferrer">{t("nearGo", lang)}</a>
              </div>
            </li>
          ))}
          <li className="crisis-small">{rows.some((r) => r.verified) ? t("nearVerified", lang) : ""} {rows.some((r) => !r.verified) ? t("nearSource", lang) : ""}</li>
        </ul>
      )}
      {cells.length > 0 && (
        <div className="nearby-cells">
          <p className="crisis-small">{t("nearCell", lang, { state: STATES[state] })}</p>
          <ul className="nearby-list">
            {cells.map((c) => <li key={c.name + c.city}><div className="nearby-name"><b>{c.name}</b><span>{c.city}</span></div><div className="nearby-actions"><a className="crisis-call" href="tel:14416">{t("nearCall", lang)} 14416</a></div></li>)}
          </ul>
        </div>
      )}
      {phase !== "idle" && phase !== "locating" && phase !== "searching" && (
        <p className="crisis-small"><a className="crisis-link" href={NEARBY_HELP_URL} target="_blank" rel="noreferrer">{t("nearMaps", lang)}</a></p>
      )}
    </div>
  );
}
