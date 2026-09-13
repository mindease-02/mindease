import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Nearby hospitals and mental-health services for the crisis card.
 *
 * - No sign-in: a crisis cannot wait for a login.
 * - The coordinates are used for this one lookup and are not stored or logged.
 * - Only what Google Places returns is shown. If the key is missing, the
 *   lookup fails, or nothing is found, the caller gets an empty list and the
 *   card falls back to the helplines and a maps search link. Nothing is ever
 *   made up.
 */
const hits = new Map<string, number[]>();

interface Place { name: string; address: string; phone: string | null; lat: number; lng: number; distanceKm: number; mapsUrl: string; openNow: boolean | null; kind: "mental_health" | "hospital" }

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function search(key: string, query: string, at: { lat: number; lng: number }, kind: Place["kind"], lang: string): Promise<Place[]> {
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.location,places.googleMapsUri,places.currentOpeningHours.openNow,places.businessStatus",
    },
    body: JSON.stringify({ textQuery: query, languageCode: lang, maxResultCount: 8, locationBias: { circle: { center: { latitude: at.lat, longitude: at.lng }, radius: 20000 } } }),
    signal: AbortSignal.timeout(4500),
    cache: "no-store",
  });
  if (!r.ok) return [];
  const j = (await r.json()) as { places?: { displayName?: { text?: string }; formattedAddress?: string; internationalPhoneNumber?: string; nationalPhoneNumber?: string; location?: { latitude: number; longitude: number }; googleMapsUri?: string; currentOpeningHours?: { openNow?: boolean }; businessStatus?: string }[] };
  return (j.places ?? [])
    .filter((p) => p.displayName?.text && p.location && p.businessStatus !== "CLOSED_PERMANENTLY")
    .map((p) => ({
      name: p.displayName!.text!, address: p.formattedAddress ?? "", phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? null,
      lat: p.location!.latitude, lng: p.location!.longitude, distanceKm: Number(km(at, { lat: p.location!.latitude, lng: p.location!.longitude }).toFixed(1)),
      mapsUrl: p.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName!.text!)}`,
      openNow: p.currentOpeningHours?.openNow ?? null, kind,
    }));
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= 8) return NextResponse.json({ results: [], fallback: true, reason: "limit" }, { status: 429 });
  list.push(now); hits.set(ip, list);

  const b = (await req.json().catch(() => ({}))) as { lat?: number; lng?: number; lang?: string };
  const lat = Number(b.lat), lng = Number(b.lng);
  const headers = { "Cache-Control": "no-store" };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return NextResponse.json({ results: [], fallback: true, reason: "no location" }, { status: 400, headers });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ results: [], fallback: true, reason: "not configured" }, { headers });
  const lang = ["en", "ta", "hi", "te", "kn", "ml"].includes(String(b.lang)) ? String(b.lang) : "en";
  try {
    const [mh, hosp] = await Promise.all([
      search(key, "psychiatric hospital OR mental health clinic", { lat, lng }, "mental_health", lang),
      search(key, "hospital emergency", { lat, lng }, "hospital", lang),
    ]);
    const seen = new Set<string>();
    const results = [...mh, ...hosp]
      .filter((p) => p.distanceKm <= 40 && !seen.has(p.name + p.address) && seen.add(p.name + p.address))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
    return NextResponse.json({ results, fallback: results.length === 0 }, { headers });
  } catch {
    return NextResponse.json({ results: [], fallback: true, reason: "lookup failed" }, { headers });
  }
}
