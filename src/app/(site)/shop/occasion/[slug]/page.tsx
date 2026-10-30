import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FacetPage } from "@/components/site/facet-page";
import { collectionSlug, getProducts } from "@/lib/repo";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const all = await getProducts("clothing");
  const products = all.filter((p) => collectionSlug(p.occasion ?? "") === slug);
  const name = products[0]?.occasion;
  return { products, name };
}

const heading = (name: string) => `${name} outfits`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { name, products } = await load((await params).slug);
  if (!name) return {};
  const t = heading(name);
  return { title: t, description: `Shop ${products.length} ${name.toLowerCase()} styles at ${site.name} — suit sets, sarees, co-ords and more. Easy exchange, COD available.`, alternates: { canonical: `/shop/occasion/${(await params).slug}` } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { products, name } = await load((await params).slug);
  if (!name) notFound();
  return <FacetPage title={heading(name)} kind="By occasion" description={`${products.length} ${products.length === 1 ? "style" : "styles"} — handpicked for you.`} products={products} />;
}
