import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopView } from "@/components/site/shop-view";
import { PageHero } from "@/components/site/page-hero";
import { getProducts } from "@/lib/repo";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Shop all", description: `Browse the full ${site.name} collection — suit sets, sarees, co-ords and more.` };
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getProducts("clothing");
  return (
    <>
      <PageHero title="Shop all" description="Filter by collection, size and budget. Every piece ships with an easy exchange." crumbs={[{ label: "Shop" }]} />
      <Suspense fallback={<div className="container-x py-16 text-center text-sm">Loading styles…</div>}><ShopView products={products} /></Suspense>
    </>
  );
}
