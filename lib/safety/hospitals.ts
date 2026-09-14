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
  // West and Central, re-checked on the official pages on 2026-09-14
  { name: "Regional Mental Hospital, Yerawada", city: "Pune", state: "MH", address: "R N G Road, Vishrantwadi, Phulenagar, Pune 411006", phone: "+912026696890", phoneDisplay: "020 2669 6890", url: "https://pune.gov.in/en/public-utility/regional-mental-hospital/", lat: 18.56, lng: 73.89, emergency24: false, government: true },
  { name: "Regional Mental Hospital", city: "Thane", state: "MH", address: "Regional Mental Hospital premises, Thane (West) 400604", phone: "", phoneDisplay: "", url: "https://nhm.maharashtra.gov.in/en/scheme/mental-health-programme/", lat: 19.20, lng: 72.95, emergency24: false, government: true },
  { name: "Sion Hospital (LTMGH)", city: "Mumbai", state: "MH", address: "Dr. Babasaheb Ambedkar Road, Sion West, Mumbai 400022", phone: "+912224063000", phoneDisplay: "022 2406 3000", url: "https://ltmgh.com/citizen-charter/", lat: 19.03, lng: 72.86, emergency24: true, government: true },
  { name: "KEM Hospital", city: "Mumbai", state: "MH", address: "Acharya Donde Marg, Parel, Mumbai 400012", phone: "+912224107000", phoneDisplay: "022 2410 7000", url: "https://www.kem.edu/contact-us", lat: 19.00, lng: 72.84, emergency24: true, government: true },
  { name: "Hospital for Mental Health", city: "Ahmedabad", state: "GJ", address: "Outside Delhi Gate, Shahibaug Road, Ahmedabad", phone: "", phoneDisplay: "", url: "https://gujhealth.gujarat.gov.in/mental-health-programme.htm", lat: 23.04, lng: 72.59, emergency24: false, government: true },
  { name: "MY Hospital (MGM Medical College)", city: "Indore", state: "MP", address: "A.B. Road, Indore 452001", phone: "+917312527383", phoneDisplay: "0731 252 7383", url: "https://www.mgmmcindore.in/hospitals.aspx?type=maharaja-yeshwant-rao-hospital", lat: 22.72, lng: 75.88, emergency24: false, government: true },
  // North, re-checked on the official pages on 2026-09-14
  { name: "IHBAS", city: "Delhi", state: "DL", address: "Jhilmil, Dilshad Garden, Delhi 110095", phone: "+911122114021", phoneDisplay: "011 2211 4021", url: "https://ihbas.delhi.gov.in/ihbas/contact-us", lat: 28.68, lng: 77.31, emergency24: true, government: true },
  { name: "AIIMS, emergency", city: "New Delhi", state: "DL", address: "Ansari Nagar, New Delhi 110029", phone: "+911126594405", phoneDisplay: "011 2659 4405", url: "https://aiims.edu/index.php/en/citizen-charter?id=231", lat: 28.57, lng: 77.21, emergency24: true, government: true },
  { name: "PGIMER, emergency enquiry", city: "Chandigarh", state: "CH", address: "Sector 12, Chandigarh 160012", phone: "+911722756565", phoneDisplay: "0172 275 6565", url: "https://pgimer.edu.in/PGIMER_PORTAL/PGIMERPORTAL/ContactUs.jsp", lat: 30.76, lng: 76.77, emergency24: true, government: true },
  { name: "KGMU, Department of Psychiatry", city: "Lucknow", state: "UP", address: "Gate 11, Shah Mina Road, Chowk, Lucknow 226003", phone: "+915222265416", phoneDisplay: "0522 226 5416", url: "https://kgmu.org/department_details.php?dept_id=26&dept_type=2", lat: 26.87, lng: 80.91, emergency24: true, government: true },
  { name: "Institute of Mental Health and Hospital", city: "Agra", state: "UP", address: "Billochpura, Mathura Road, Agra 282002", phone: "+915622967811", phoneDisplay: "0562 296 7811", url: "https://imhh.org.in/contact-us/", lat: 27.21, lng: 78.01, emergency24: false, government: true },
  { name: "Institute of Mental Health", city: "Amritsar", state: "PB", address: "Circular Road, Amritsar 143001", phone: "+911832423920", phoneDisplay: "0183 242 3920", url: "https://imhamritsar.org/index-info-contacts.html", lat: 31.65, lng: 74.88, emergency24: false, government: true },
  { name: "IGMC, emergency", city: "Shimla", state: "HP", address: "Ridge Sanjauli Road, Lakkar Bazar, Shimla 171001", phone: "+911772654713", phoneDisplay: "0177 265 4713", url: "http://www.igmcshimla.edu.in/emg_numbers.jsp", lat: 31.11, lng: 77.18, emergency24: true, government: true },
  { name: "Psychiatric Diseases Hospital, GMC Jammu", city: "Jammu", state: "JK", address: "Ambphalla, Jammu", phone: "+911912584290", phoneDisplay: "0191 258 4290", url: "https://gmcjammu.jk.gov.in/psyhospital.aspx", lat: 32.74, lng: 74.86, emergency24: false, government: true },
  { name: "Psychiatric Diseases Hospital, GMC Srinagar", city: "Srinagar", state: "JK", address: "Badamwari Park Road, Rainawari, Srinagar 190003", phone: "+919796527260", phoneDisplay: "97965 27260", url: "https://srinagar.nic.in/public-utility/psychiatric-diseases-hospital/", lat: 34.10, lng: 74.82, emergency24: false, government: true },
  { name: "Doon Hospital (Government Doon Medical College)", city: "Dehradun", state: "UK", address: "Patel Nagar, Dehradun", phone: "+911352726020", phoneDisplay: "0135 272 6020", url: "https://gdmcuk.com/psychiatry/", lat: 30.32, lng: 78.04, emergency24: true, government: true },
  { name: "Regional Mental Hospital", city: "Nagpur", state: "MH", address: "Pagalkhana Square, Koradi Road, Nagpur 440001", phone: "+917122583176", phoneDisplay: "0712 258 3176", url: "https://nagpur.gov.in/public-utility/regional-mental-hospital/", lat: 21.18, lng: 79.08, emergency24: false, government: true },
  { name: "Regional Mental Hospital", city: "Ratnagiri", state: "MH", address: "Main Road, Ratnagiri 415612", phone: "+912352222345", phoneDisplay: "02352 222345", url: "https://ratnagiri.gov.in/contact-directory/", lat: 16.99, lng: 73.31, emergency24: false, government: true },
  { name: "AIIMS Bhopal, emergency", city: "Bhopal", state: "MP", address: "Saket Nagar, Bhopal 462020", phone: "+917552970771", phoneDisplay: "0755 297 0771", url: "https://aiimsbhopal.edu.in/index_controller/emergency", lat: 23.21, lng: 77.46, emergency24: true, government: true },
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
