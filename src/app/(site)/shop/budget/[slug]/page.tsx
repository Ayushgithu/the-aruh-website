import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FacetPage } from "@/components/site/facet-page";
import { getProducts } from "@/lib/repo";
import { budgets, site } from "@/lib/site";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
const limitOf = (slug: string) => { const m = slug.match(/^under-(\d+)$/); const n = m ? Number(m[1]) : 0; return budgets.includes(n) ? n : 0; };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const slug = (await params).slug; const n = limitOf(slug);
  return n ? { title: `Outfits under ${formatPrice(n)}`, description: `Beautiful suit sets, kurtis and co-ords under ${formatPrice(n)} at ${site.name}.`, alternates: { canonical: `/shop/budget/${slug}` } } : {};
}

export default async function BudgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const n = limitOf((await params).slug);
  if (!n) notFound();
  const products = (await getProducts("clothing")).filter((p) => p.price <= n);
  return <FacetPage title={`Outfits under ${formatPrice(n)}`} kind="By budget" description={`${products.length} ${products.length === 1 ? "style" : "styles"} that fit your budget.`} products={products} />;
}
