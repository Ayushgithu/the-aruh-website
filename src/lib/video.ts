/** Turns a pasted product-video link into something we can play. Supports YouTube (watch / youtu.be / shorts) and direct .mp4 / .webm links. */
export function parseVideo(url?: string): { kind: "youtube"; id: string } | { kind: "file"; src: string } | { kind: "link"; href: string } | null {
  const u = (url ?? "").trim();
  if (!/^https?:\/\//i.test(u)) return null;
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{11})/i);
  if (yt) return { kind: "youtube", id: yt[1] };
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(u)) return { kind: "file", src: u };
  return { kind: "link", href: u };
}
