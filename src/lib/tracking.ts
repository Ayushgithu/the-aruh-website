/** Where the customer can follow the parcel. Uses the courier's own link when we have one, else Shiprocket's public tracking page. */
export function trackingUrl(t?: { number?: string; url?: string } | null): string | null {
  if (!t?.number) return null;
  if (t.url && /^https?:\/\//i.test(t.url)) return t.url;
  return `https://shiprocket.co/tracking/${encodeURIComponent(t.number)}`;
}
