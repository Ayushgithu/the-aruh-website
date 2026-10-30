"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn, discountPct } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { ProductCard } from "./product-card";

const SORTS = [
  { v: "featured", label: "Featured" },
  { v: "new", label: "Newest first" },
  { v: "price-asc", label: "Price: low to high" },
  { v: "price-desc", label: "Price: high to low" },
  { v: "discount", label: "Biggest discount" },
] as const;
const PRICES = [
  { v: "", label: "Any price" },
  { v: "0-1000", label: "Under ₹1,000" },
  { v: "1000-2000", label: "₹1,000 – ₹2,000" },
  { v: "2000-3500", label: "₹2,000 – ₹3,500" },
  { v: "3500-", label: "₹3,500 & above" },
];
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"];
const PAGE = 24;

const chip = (on: boolean) => cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", on ? "border-ink bg-ink text-card" : "border-line bg-card text-ink hover:border-ink");

export function ShopView({ products, lockedCollection }: { products: Product[]; lockedCollection?: string }) {
  const sp = useSearchParams();
  const [collection, setCollection] = React.useState(lockedCollection ?? sp.get("collection") ?? "");
  const [sort, setSort] = React.useState<string>(sp.get("sort") ?? "featured");
  const [sizes, setSizes] = React.useState<string[]>([]);
  const [price, setPrice] = React.useState("");
  const [inStock, setInStock] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [shown, setShown] = React.useState(PAGE);

  const categories = React.useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);
  const allSizes = React.useMemo(() => {
    const set = new Set(products.flatMap((p) => p.sizes?.map((s) => s.label) ?? []));
    return [...set].sort((a, b) => (SIZE_ORDER.indexOf(a) + 1 || 99) - (SIZE_ORDER.indexOf(b) + 1 || 99));
  }, [products]);

  const list = React.useMemo(() => {
    let r = products.filter((p) => {
      if (collection && p.category !== collection) return false;
      if (inStock && p.stock === "out") return false;
      if (sizes.length && !p.sizes?.some((s) => sizes.includes(s.label) && s.qty > 0)) return false;
      if (price) { const [lo, hi] = price.split("-"); if (p.price < Number(lo || 0) || (hi && p.price >= Number(hi))) return false; }
      return true;
    });
    const by: Record<string, (a: Product, b: Product) => number> = {
      new: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      discount: (a, b) => discountPct(b.price, b.mrp) - discountPct(a.price, a.mrp),
      featured: (a, b) => Number(!!b.featured) - Number(!!a.featured) || b.views - a.views,
    };
    r = [...r].sort(by[sort] ?? by.featured);
    return r;
  }, [products, collection, inStock, sizes, price, sort]);

  React.useEffect(() => setShown(PAGE), [collection, inStock, sizes, price, sort]);
  const active = (lockedCollection ? 0 : collection ? 1 : 0) + sizes.length + (price ? 1 : 0) + (inStock ? 1 : 0);
  const clear = () => { if (!lockedCollection) setCollection(""); setSizes([]); setPrice(""); setInStock(false); };

  const filters = (
    <div className="space-y-7">
      {!lockedCollection && categories.length > 1 && (
        <div><h3 className="mb-3 font-sans text-sm font-bold uppercase tracking-[0.14em] text-ink">Collection</h3>
          <div className="flex flex-wrap gap-2"><button className={chip(!collection)} onClick={() => setCollection("")}>All</button>{categories.map((c) => <button key={c} className={chip(collection === c)} onClick={() => setCollection(c)}>{c}</button>)}</div></div>
      )}
      {allSizes.length > 0 && (
        <div><h3 className="mb-3 font-sans text-sm font-bold uppercase tracking-[0.14em] text-ink">Size</h3>
          <div className="flex flex-wrap gap-2">{allSizes.map((s) => <button key={s} aria-pressed={sizes.includes(s)} className={chip(sizes.includes(s))} onClick={() => setSizes((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]))}>{s}</button>)}</div></div>
      )}
      <div><h3 className="mb-3 font-sans text-sm font-bold uppercase tracking-[0.14em] text-ink">Price</h3>
        <div className="flex flex-wrap gap-2">{PRICES.map((p) => <button key={p.v} className={chip(price === p.v)} onClick={() => setPrice(p.v)}>{p.label}</button>)}</div></div>
      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ink"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="h-5 w-5 accent-[var(--color-primary)]" /> In stock only</label>
      {active > 0 && <Button variant="ghost" size="sm" onClick={clear}><X className="h-4 w-4" /> Clear all filters</Button>}
    </div>
  );

  return (
    <div className="container-x grid gap-8 py-8 lg:grid-cols-[17rem_1fr] lg:gap-12 lg:py-12">
      <aside className="hidden lg:block"><div className="sticky top-28">{filters}</div></aside>

      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" aria-live="polite"><strong className="text-ink">{list.length}</strong> {list.length === 1 ? "style" : "styles"}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full lg:hidden" onClick={() => setOpen(true)}><SlidersHorizontal className="h-4 w-4" /> Filters{active > 0 && ` (${active})`}</Button>
            <label className="sr-only" htmlFor="sort">Sort by</label>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 rounded-full border border-line bg-card px-4 text-sm font-medium text-ink outline-none focus:border-primary">
              {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-faint text-primary"><SearchX className="h-8 w-8" /></span>
            <h2 className="mt-5 text-xl">No styles match these filters</h2>
            <p className="mt-2 text-sm">Try removing a filter or two.</p>
            <Button className="mt-6 rounded-full" onClick={clear}>Clear filters</Button>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 xl:grid-cols-3">{list.slice(0, shown).map((p) => <li key={p.id}><ProductCard product={p} /></li>)}</ul>
            {shown < list.length && <div className="mt-10 text-center"><Button variant="outline" size="lg" className="rounded-full px-10" onClick={() => setShown((n) => n + PAGE)}>Load more</Button></div>}
          </>
        )}
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="Filters" side="left" footer={<Button className="w-full rounded-full" size="lg" onClick={() => setOpen(false)}>Show {list.length} styles</Button>}>{filters}</Drawer>
    </div>
  );
}
