import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopView } from "@/components/site/shop-view";
import { PageHero } from "@/components/site/page-hero";
import { getProducts } from "@/lib/repo";

export const metadata: Metadata = { title: "Accessories", description: "Dupattas, jewellery, bags and finishing touches to complete your look." };
export const dynamic = "force-dynamic";

export default async function AccessoriesPage() {
  const products = await getProducts("accessory");
  return (
    <>
      <PageHero title="Accessories" description="Dupattas, jewellery, bags and the little things that complete the look." crumbs={[{ label: "Accessories" }]} />
      <Suspense fallback={null}><ShopView products={products} /></Suspense>
    </>
  );
}
