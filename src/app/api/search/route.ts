import { ok, publicRoute } from "@/lib/api-helpers";
import { searchCatalog } from "@/lib/repo";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Live-search suggestions. Typo-tolerant (see src/lib/search.ts). */
export const GET = publicRoute(async (req) => {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2 || !rateLimit(`search:${clientIp(req)}`, 120, 60_000)) return ok({ results: [] });
  const found = await searchCatalog(q, 6);
  return ok({
    results: found.map((p) => ({ id: p.id, slug: p.slug, name: p.name, brand: p.brand, price: p.price, type: p.type, stock: p.stock, art: p.art, image: p.images?.[0] })),
  });
});
