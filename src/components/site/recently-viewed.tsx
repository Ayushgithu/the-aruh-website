"use client";
import * as React from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ProductVisual } from "./product-art";

const KEY = "lc_recent_products";
type Mini = Pick<Product, "id" | "slug" | "name" | "price" | "mrp" | "images" | "art" | "category" | "createdAt" | "type" | "brand" | "condition" | "stock" | "tags" | "specs" | "highlights" | "included" | "conditionNotes" | "description" | "warranty" | "views">;

const read = (): Mini[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

/** Remembers the clothes this visitor looked at (in their own browser) and shows them under the product. */
export function RecentlyViewed({ current }: { current: Product }) {
  const [items, setItems] = React.useState<Mini[]>([]);
  React.useEffect(() => {
    const mini: Mini = { ...current, images: current.images?.slice(0, 1), specs: {}, highlights: [], included: [], conditionNotes: [], description: "", sizes: undefined, colors: undefined } as Mini;
    const list = [mini, ...read().filter((x) => x.id !== current.id)].slice(0, 8);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
    setItems(list.filter((x) => x.id !== current.id).slice(0, 4));
  }, [current]);
  if (!items.length) return null;
  return (
    <section className="container-x pb-14" aria-labelledby="recent">
      <h2 id="recent" className="text-2xl">Recently viewed</h2>
      <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((p) => (
          <li key={p.id}>
            <Link href={`/product/${p.slug}`} className="group block">
              <div className="overflow-hidden rounded-xl"><ProductVisual product={p as Product} className="transition duration-500 group-hover:scale-105" /></div>
              <p className="mt-2 line-clamp-1 text-sm font-semibold text-ink">{p.name}</p>
              <p className="text-sm">{formatPrice(p.price)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
