/**
 * Hospitals that handle psychiatric emergencies, for the crisis card.
 *
 * Hard-coded and verified against each institution's own site or a government
 * site; nothing here is generated. The card shows the nearest few to the
 * person's location if they share it for that one lookup, or the ones in a
 * state they pick. When a Google Places key is configured, live results are
 * shown above these. Re-verify every few months; numbers change.
 *
 * Verified: 2026-09-14 (see docs/REVIEW-2026-09-14.md for sources).
 */
export interface Hospital {
  name: string;
  city: string;
  /** Two-letter state code as used by India Post, e.g. "TN". */
  state: string;
  address: string;
  /** E.164 digits for tel: links; empty when no official number could be confirmed. */
  phone: string;
  /** How the number is shown. */
  phoneDisplay: string;
  url: string;
  lat: number;
  lng: number;
  /** True when the institution runs a 24-hour emergency or casualty. */
  emergency24: boolean;
  /** Government institution (free or low-cost care). */
  government: boolean;
}

export const STATES: Record<string, string> = {
  AN: "Andaman and Nicobar Islands", AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar", CH: "Chandigarh", CG: "Chhattisgarh",
  DN: "Dadra and Nagar Haveli and Daman and Diu", DL: "Delhi", GA: "Goa", GJ: "Gujarat", HR: "Haryana", HP: "Himachal Pradesh", JK: "Jammu and Kashmir",
  JH: "Jharkhand", KA: "Karnataka", KL: "Kerala", LA: "Ladakh", LD: "Lakshadweep", MP: "Madhya Pradesh", MH: "Maharashtra", MN: "Manipur", ML: "Meghalaya",
  MZ: "Mizoram", NL: "Nagaland", OD: "Odisha", PY: "Puducherry", PB: "Punjab", RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu", TS: "Telangana",
  TR: "Tripura", UP: "Uttar Pradesh", UK: "Uttarakhand", WB: "West Bengal",
};

/**
 * Tele-MANAS cells: the centre that answers 14416 in each state or union
 * territory. From telemanas.mohfw.gov.in/TMCCells (site updated 13 May 2026).
 * A cell is a call centre reached through 14416, not a place to walk into;
 * the card says so. Names as the site spells them.
 */
export const TELEMANAS_CELLS: Record<string, { name: string; city: string }[]> = {
  AN: [{ name: "ANIIMS", city: "Port Blair" }],
  AP: [{ name: "Government Hospital for Mental Care", city: "Visakhapatnam" }, { name: "Siddartha Medical College", city: "Vijayawada" }],
  AR: [{ name: "Mental Hospital", city: "Midpu" }],
  AS: [{ name: "State Head Quarters, NHM", city: "Guwahati" }],
  BR: [{ name: "Bihar Institute of Mental Health and Allied Sciences", city: "Koilwar, Bhojpur" }, { name: "Indira Gandhi Institute of Medical Sciences", city: "Patna" }, { name: "Jawaharlal Nehru Medical College and Hospital", city: "Bhagalpur" }],
  CH: [{ name: "Govt Medical College and Hospital, Sector 32", city: "Chandigarh" }],
  CG: [{ name: "District Hospital", city: "Raipur" }],
  DN: [{ name: "Shri Vinoba Bhave Civil Hospital", city: "Silvassa" }],
  DL: [{ name: "IHBAS", city: "New Delhi" }],
  GA: [{ name: "South District Hospital", city: "Margao" }],
  GJ: [{ name: "Hospital for Mental Health", city: "Ahmedabad" }],
  HR: [{ name: "Civil Hospital, Sector 6", city: "Panchkula" }],
  HP: [{ name: "104 Centre", city: "Solan" }],
  JK: [{ name: "IMHANS", city: "Srinagar" }],
  JH: [{ name: "CIP", city: "Ranchi" }],
  KA: [{ name: "NIMHANS", city: "Bengaluru" }, { name: "DIMHANS", city: "Dharwad" }],
  KL: [{ name: "State Mental Health Programme office, Mental Health Centre campus", city: "Thiruvananthapuram" }],
  LA: [{ name: "Ladakh Tele MANAS Cell", city: "Leh" }],
  LD: [{ name: "Lakshadweep Tele Manas Cell", city: "Kavaratti" }],
  MP: [{ name: "MGM Medical College", city: "Indore" }, { name: "Gwalior Mental Hospital", city: "Gwalior" }],
  MH: [{ name: "Regional Mental Hospital", city: "Thane" }, { name: "Regional Mental Hospital", city: "Pune" }, { name: "Ambejogai District Hospital", city: "Beed" }, { name: "Nagpur Tele MANAS Cell", city: "Nagpur" }],
  MN: [{ name: "Regional Institute of Medical Sciences", city: "Imphal" }],
  ML: [{ name: "MIMHANS", city: "Shillong" }],
  MZ: [{ name: "Directorate of Hospital and Medical Education", city: "Aizawl" }],
  NL: [{ name: "State Mental Health Institute", city: "Thekuba" }],
  OD: [{ name: "Mental Health Institute, SCB MCH", city: "Cuttack" }, { name: "DMHP unit, MKCG MCH campus", city: "Berhampur" }],
  PY: [{ name: "Indira Gandhi Government General Hospital and Post Graduate Institute", city: "Puducherry" }],
  PB: [{ name: "Institute of Mental Health", city: "Amritsar" }],
  RJ: [{ name: "Psychiatry Centre, SMS Medical College", city: "Jaipur" }, { name: "MDM Hospital", city: "Jodhpur" }],
  SK: [{ name: "Tele-Manas Sikkim Cell", city: "Gangtok" }],
  TN: [{ name: "Institute of Mental Health", city: "Chennai" }],
  TS: [{ name: "Institute of Mental Health", city: "Hyderabad" }],
  TR: [{ name: "Modern Psychiatric Hospital", city: "Narsingarh" }],
  UP: [{ name: "Mental Health Institute and Hospital", city: "Agra" }, { name: "Mental Hospital", city: "Varanasi" }, { name: "Mental Health Hospital", city: "Bareilly" }, { name: "BRD Medical College", city: "Gorakhpur" }],
  UK: [{ name: "Mental Health Institute", city: "Selaqui, Dehradun" }],
  WB: [{ name: "Institute of Psychiatry", city: "Kolkata" }],
};

export const HOSPITALS: Hospital[] = [
  // South, re-checked on the official pages on 2026-09-14
  { name: "NIMHANS", city: "Bengaluru", state: "KA", address: "Hosur Road, Lakkasandra, Bengaluru 560029", phone: "+918026995000", phoneDisplay: "080 2699 5000", url: "https://www.nimhans.ac.in/contact-us", lat: 12.94, lng: 77.60, emergency24: true, government: true },
  { name: "DIMHANS", city: "Dharwad", state: "KA", address: "Belgaum Road, Dharwad 580008", phone: "+918362440202", phoneDisplay: "0836 244 0202", url: "https://dimhans.karnataka.gov.in/93/contact-us/en", lat: 15.47, lng: 75.00, emergency24: true, government: true },
  { name: "Institute of Mental Health", city: "Chennai", state: "TN", address: "Medavakkam Tank Road, Kilpauk, Chennai 600010", phone: "", phoneDisplay: "", url: "https://mmc.tn.gov.in/en/teaching-hospitals/imh/", lat: 13.09, lng: 80.24, emergency24: false, government: true },
  { name: "Government Mental Health Centre", city: "Kozhikode", state: "KL", address: "Kuthiravattom, Kozhikode 673016", phone: "+914952741386", phoneDisplay: "0495 274 1386", url: "https://dhs.kerala.gov.in/wp-content/uploads/2025/10/MHC.pdf", lat: 11.25, lng: 75.80, emergency24: false, government: true },
  { name: "Mental Health Centre, Peroorkada", city: "Thiruvananthapuram", state: "KL", address: "Peroorkada P.O., Thiruvananthapuram 695005", phone: "+914712434762", phoneDisplay: "0471 243 4762", url: "https://dhs.kerala.gov.in/wp-content/uploads/2025/10/MHC.pdf", lat: 8.53, lng: 76.97, emergency24: false, government: true },
  { name: "Institute of Mental Health", city: "Hyderabad", state: "TS", address: "Erragadda Main Road, Erragadda, Hyderabad 500038", phone: "+914023813252", phoneDisplay: "040 2381 3252", url: "https://imhhyd.org/contact-us/", lat: 17.45, lng: 78.44, emergency24: true, government: true },
  // East and North-East, re-checked on the official pages on 2026-09-14
  { name: "Central Institute of Psychiatry", city: "Ranchi", state: "JH", address: "Kanke, Ranchi 834006", phone: "+916512451115", phoneDisplay: "0651 245 1115", url: "https://dghs.mohfw.gov.in/mainsitedghs/uploads/assets/1JW0cfqkeOeTIl3ZfCHD5hm5bgg6hhjIEItcGTEA.pdf", lat: 23.44, lng: 85.33, emergency24: true, government: true },
  { name: "RINPAS", city: "Ranchi", state: "JH", address: "Kanke, Ranchi 834006", phone: "+916512450813", phoneDisplay: "0651 245 0813", url: "https://rinpas.jharkhand.gov.in/contact-us", lat: 23.43, lng: 85.31, emergency24: true, government: true },
  { name: "LGBRIMH", city: "Tezpur", state: "AS", address: "Kalibari Main Road, Mahabhairab, Tezpur 784001", phone: "+913712232652", phoneDisplay: "03712 232652", url: "https://lgbrimh.gov.in/contactus.html", lat: 26.63, lng: 92.81, emergency24: true, government: true },
  { name: "Gauhati Medical College and Hospital", city: "Guwahati", state: "AS", address: "Bhangagarh, Guwahati 781032", phone: "+913613582043", phoneDisplay: "0361 358 2043", url: "https://gmch.assam.gov.in/contact-us", lat: 26.16, lng: 91.77, emergency24: true, government: true },
  { name: "Institute of Psychiatry, IPGMER", city: "Kolkata", state: "WB", address: "7 D. L. Khan Road, Kolkata 700025", phone: "+913322236048", phoneDisplay: "033 2223 6048", url: "https://www.iopkolkata.ac.in/contact-us/", lat: 22.54, lng: 88.34, emergency24: true, government: true },
  { name: "Mental Health Institute, SCB Medical College", city: "Cuttack", state: "OD", address: "Behera Colony, Cuttack 753007", phone: "+916712414359", phoneDisplay: "0671 241 4359", url: "https://mentalhealthinstitute-scb.odisha.gov.in/", lat: 20.47, lng: 85.89, emergency24: false, government: true },
  { name: "IGIMS", city: "Patna", state: "BR", address: "Sheikhpura, Patna 800014", phone: "+916122297631", phoneDisplay: "0612 229 7631", url: "https://www.igims.org/contact-us", lat: 25.61, lng: 85.09, emergency24: true, government: true },
  { name: "State Mental Health Hospital", city: "Sendri, Bilaspur", state: "CG", address: "Village Sendri, Bilaspur", phone: "+917489572085", phoneDisplay: "74895 72085", url: "https://bilaspur.gov.in/en/public-utility/state-mental-health-hospital/", lat: 22.14, lng: 82.13, emergency24: false, government: true },
  { name: "MIMHANS", city: "Shillong", state: "ML", address: "Pasteur Hills, Lawmali, Shillong", phone: "", phoneDisplay: "", url: "https://meghealth.gov.in/mimhans.html", lat: 25.59, lng: 91.88, emergency24: false, government: true },
  { name: "Institute of Psychiatry and Human Behaviour", city: "Bambolim, Goa", state: "GA", address: "Opposite Holy Cross Shrine, Bambolim, Goa 403202", phone: "+918322458687", phoneDisplay: "0832 245 8687", url: "https://iphb.goa.gov.in/contact-us/", lat: 15.45, lng: 73.86, emergency24: true, government: true },
];

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, dLat = ((b.lat - a.lat) * Math.PI) / 180, dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** The nearest hospitals within `maxKm`, closest first. */
export function nearest(at: { lat: number; lng: number }, maxKm = 250, limit = 3): (Hospital & { distanceKm: number })[] {
  return HOSPITALS.map((h) => ({ ...h, distanceKm: Number(km(at, h).toFixed(0)) })).filter((h) => h.distanceKm <= maxKm).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}

export function inState(state: string): Hospital[] {
  return HOSPITALS.filter((h) => h.state === state);
}
