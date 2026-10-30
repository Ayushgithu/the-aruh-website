import { Suspense } from "react";
import { PageHero } from "./page-hero";
import { ShopView } from "./shop-view";
import type { Product } from "@/lib/types";

/** A "shop by occasion / colour / budget" landing page: a heading Google can read plus the filtered products. */
export function FacetPage({ title, description, kind, products }: { title: string; description: string; kind: string; products: Product[] }) {
  return (
    <>
      <PageHero title={title} description={description} crumbs={[{ label: "Shop", href: "/shop" }, { label: kind }, { label: title }]} />
      <Suspense fallback={null}><ShopView products={products} /></Suspense>
    </>
  );
}
