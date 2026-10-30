import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShopView } from "@/components/site/shop-view";
import { PageHero } from "@/components/site/page-hero";
import { collectionSlug, getProducts } from "@/lib/repo";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const all = await getProducts("clothing");
  const products = all.filter((p) => collectionSlug(p.category) === slug);
  return { products, name: products[0]?.category };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { name } = await load((await params).slug);
  return name ? { title: name, description: `Shop ${name}.` } : {};
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { products, name } = await load((await params).slug);
  if (!name) notFound();
  return (
    <>
      <PageHero title={name} description={`${products.length} ${products.length === 1 ? "style" : "styles"} in this collection.`} crumbs={[{ label: "Shop", href: "/shop" }, { label: name }]} />
      <Suspense fallback={null}><ShopView products={products} lockedCollection={name} /></Suspense>
    </>
  );
}
