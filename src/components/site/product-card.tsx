"use client";
import Link from "next/link";
import * as React from "react";
import { Heart, Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn, discountPct, formatPrice } from "@/lib/utils";
import { useCustomer } from "@/hooks/use-customer";
import { ProductVisual } from "./product-art";
import { QuickView } from "./quick-view";

export function WishlistButton({ productId, name, className }: { productId: string; name: string; className?: string }) {
  const { wishlist, toggleWishlist } = useCustomer();
  const saved = wishlist.includes(productId);
  return (
    <button
      type="button"
      onClick={() => void toggleWishlist({ id: productId, name })}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur transition",
        saved ? "border-primary/30 bg-primary-faint text-primary" : "border-white/60 bg-white/90 text-slate-600 hover:text-primary dark:bg-card/90",
        className,
      )}
    >
      <Heart className={cn("h-[18px] w-[18px]", saved && "fill-current")} />
    </button>
  );
}

function Tag({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "primary" | "gold" | "dark" }) {
  const t = { light: "bg-white/95 text-ink", primary: "bg-primary text-white", gold: "bg-gold text-white", dark: "bg-ink text-card" }[tone];
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm", t)}>{children}</span>;
}

export function ProductCard({ product: p, className }: { product: Product; className?: string }) {
  const off = discountPct(p.price, p.mrp);
  const sold = p.stock === "out";
  const [quick, setQuick] = React.useState(false);
  const isNew = Date.now() - new Date(p.createdAt).getTime() < 14 * 86_400_000;
  const tags = (p.badges ?? []).slice(0, 2);

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative overflow-hidden rounded-2xl bg-surface">
        <Link href={`/product/${p.slug}`} aria-label={`View ${p.name}`} className="block">
          <div className={cn("transition duration-700 ease-out group-hover:scale-[1.04]", sold && "opacity-60 grayscale-[35%]")}>
            <ProductVisual product={p} />
          </div>
          {p.images?.[1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images[1]} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {sold ? <Tag tone="dark">Sold out</Tag> : off > 0 && <Tag tone="primary">-{off}%</Tag>}
          {!sold && p.flash && <Tag tone="gold">⚡ Flash sale</Tag>}
          {!sold && tags.map((b) => <Tag key={b} tone="gold">{b}</Tag>)}
          {!sold && !tags.length && isNew && <Tag>New</Tag>}
        </div>
        <WishlistButton productId={p.id} name={p.name} className="absolute right-3 top-3" />

        {!sold && (
          <>
            <button
              type="button"
              onClick={() => setQuick(true)}
              className="absolute inset-x-3 bottom-3 hidden translate-y-3 items-center justify-center gap-2 rounded-full bg-white/95 py-2.5 text-sm font-semibold text-ink opacity-0 shadow-lg backdrop-blur transition duration-300 hover:bg-ink hover:text-white group-hover:translate-y-0 group-hover:opacity-100 md:flex"
            >
              <Plus className="h-4 w-4" /> Quick add
            </button>
            <button type="button" onClick={() => setQuick(true)} aria-label={`Quick add ${p.name}`} className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-ink shadow-md md:hidden">
              <Plus className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div className="px-0.5 pt-3.5">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-body">{p.category}</p>
        <h3 className="mt-1 line-clamp-2 font-sans text-[15px] font-semibold leading-snug tracking-normal">
          <Link href={`/product/${p.slug}`} className="hover:text-primary">{p.name}</Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-bold text-ink">{formatPrice(p.price)}</span>
          {p.mrp && p.mrp > p.price && <span className="text-sm text-slate-500 line-through">{formatPrice(p.mrp)}</span>}
        </p>
        {p.colors && p.colors.length > 1 && (
          <p className="mt-2 flex items-center gap-1.5" aria-label={`${p.colors.length} colours`}>
            {p.colors.slice(0, 5).map((c) => <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ background: c.hex ?? "#d6cfc9" }} />)}
            {p.colors.length > 5 && <span className="text-xs">+{p.colors.length - 5}</span>}
          </p>
        )}
      </div>
      {quick && <QuickView product={p} open={quick} onClose={() => setQuick(false)} />}
    </article>
  );
}
