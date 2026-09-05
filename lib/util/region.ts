/**
 * Region code used to pick helplines. The time zone wins over the browser
 * locale because many phones in India run en-US, and the region decides which
 * crisis numbers a person sees.
 */
const TZ_REGION: Record<string, string> = { "Asia/Kolkata": "IN", "Asia/Calcutta": "IN" };

export function regionFor(timeZone?: string, language?: string): string | undefined {
  if (timeZone && TZ_REGION[timeZone]) return TZ_REGION[timeZone];
  const tag = (language ?? "").split("-")[1]?.toUpperCase();
  return tag && /^[A-Z]{2}$/.test(tag) ? tag : undefined;
}
