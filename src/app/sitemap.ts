import type { MetadataRoute } from "next";
import { collectionSlug, getFacets, getProducts, getCollections } from "@/lib/repo";
import { budgets } from "@/lib/site";

export const dynamic = "force-dynamic";
const base = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Lists every public page for Google: products, collections and the occasion / colour / budget pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const b = base();
  const now = new Date();
  const fixed = ["", "/shop", "/accessories", "/about", "/contact", "/size-guide", "/track", "/policies/shipping", "/policies/returns", "/policies/privacy", "/policies/terms"].map((p) => ({ url: `${b}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 }));
  const budgetPages = budgets.map((n) => ({ url: `${b}/shop/budget/under-${n}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.5 }));
  try {
    const [products, accessories, collections, facets] = await Promise.all([getProducts("clothing"), getProducts("accessory"), getCollections(), getFacets()]);
    return [
      ...fixed, ...budgetPages,
      ...collections.map((c) => ({ url: `${b}/collections/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
      ...facets.occasions.map((o) => ({ url: `${b}/shop/occasion/${o.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
      ...facets.colors.map((c) => ({ url: `${b}/shop/colour/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.5 })),
      ...[...products, ...accessories].map((p) => ({ url: `${b}/product/${p.slug}`, lastModified: new Date(p.createdAt), changeFrequency: "weekly" as const, priority: 0.7 })),
    ];
  } catch { return [...fixed, ...budgetPages]; } // the sitemap must never fail just because the database blinked
}
void collectionSlug;
