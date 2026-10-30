"use client";
import * as React from "react";
import Link from "next/link";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import { discountPct, formatPrice } from "@/lib/utils";
import { Dialog } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useCustomer } from "@/hooks/use-customer";
import { ProductVisual } from "./product-art";
import { ColorPicker, SizePicker, useVariant } from "./variant-picker";
import { SizeGuideButton } from "./size-guide";

export function QuickView({ product: p, open, onClose }: { product: Product; open: boolean; onClose: () => void }) {
  const v = useVariant(p);
  const { addToCart } = useCustomer();
  const [busy, setBusy] = React.useState(false);
  const [invalid, setInvalid] = React.useState(false);
  const off = discountPct(p.price, p.mrp);
  const sold = p.stock === "out";

  const add = async () => {
    if (v.needSize && !v.size) { setInvalid(true); toast("Please choose a size"); return; }
    setBusy(true);
    try { if (await addToCart(p, 1, { size: v.size, color: v.color })) onClose(); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} title={p.name} wide>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="overflow-hidden rounded-2xl"><ProductVisual product={p} /></div>
        <div>
          <p className="eyebrow">{p.category}</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <span className="text-2xl font-bold text-ink">{formatPrice(p.price)}</span>
            {p.mrp && p.mrp > p.price && <span className="text-slate-500 line-through">{formatPrice(p.mrp)}</span>}
            {off > 0 && <span className="rounded-full bg-primary-faint px-2.5 py-0.5 text-xs font-bold text-primary">{off}% OFF</span>}
          </p>
          {v.colors.length > 0 && (
            <div className="mt-5"><p className="mb-2 text-sm font-semibold text-ink">Colour: <span className="font-normal text-body">{v.color}</span></p><ColorPicker colors={v.colors} value={v.color} onChange={v.setColor} /></div>
          )}
          {v.needSize && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-ink">Size</p><SizeGuideButton /></div>
              <SizePicker sizes={v.sizes} value={v.size} onChange={(s) => { v.setSize(s); setInvalid(false); }} invalid={invalid} />
            </div>
          )}
          <div className="mt-6 grid gap-3">
            {sold ? <Button size="lg" disabled>Sold out</Button> : (
              <Button size="lg" onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />} Add to bag</Button>
            )}
            <Button asChild variant="outline" size="lg"><Link href={`/product/${p.slug}`} onClick={onClose}>View full details</Link></Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
