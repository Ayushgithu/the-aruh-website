"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/utils";
import { productMessage, waLink } from "@/lib/site";
import { useCustomer } from "@/hooks/use-customer";
import { WishlistButton } from "./product-card";
import { ColorPicker, SizePicker, useVariant } from "./variant-picker";
import { useSharedVariant } from "./variant-context";
import { SizeAdvisorButton } from "./size-advisor";
import { SizeGuideButton } from "./size-guide";
import { PincodeCheck } from "./pincode-check";

export function PurchasePanel({ product: p }: { product: Product }) {
  const router = useRouter();
  const { addToCart, cart } = useCustomer();
  const own = useVariant(p);
  const v = useSharedVariant() ?? own;
  const [qty, setQty] = React.useState(1);
  const [busy, setBusy] = React.useState<"add" | "buy" | null>(null);
  const [invalid, setInvalid] = React.useState(false);
  const sold = p.stock === "out";
  const max = Math.max(1, Math.min(v.needSize ? v.qtyLeft ?? 10 : p.quantity ?? 10, 10));
  const inBag = cart.filter((l) => l.productId === p.id).reduce((n, l) => n + l.quantity, 0);

  const guard = () => {
    if (v.needSize && !v.size) {
      setInvalid(true);
      toast("Please choose a size first");
      document.getElementById("size-block")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };
  const run = async (kind: "add" | "buy") => {
    if (!guard()) return;
    setBusy(kind);
    try {
      const ok = await addToCart(p, qty, { size: v.size, color: v.color });
      if (ok && kind === "buy") router.push("/checkout");
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      {v.colors.length > 0 && (
        <div><p className="mb-2.5 text-sm font-semibold text-ink">Colour: <span className="font-normal text-body">{v.color}</span></p><ColorPicker colors={v.colors} value={v.color} onChange={v.setColor} /></div>
      )}
      {v.needSize && (
        <div id="size-block">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-ink">Select size{v.size && <span className="font-normal text-body"> · {v.size}</span>}</p><span className="flex items-center gap-4"><SizeAdvisorButton sizes={v.sizes} onPick={(s) => { v.setSize(s); setInvalid(false); setQty(1); }} /><SizeGuideButton /></span></div>
          <SizePicker sizes={v.sizes} value={v.size} onChange={(s) => { v.setSize(s); setInvalid(false); setQty(1); }} invalid={invalid} />
          {invalid && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">Please select a size to continue.</p>}
        </div>
      )}

      {sold ? (
        <Button size="lg" className="w-full" disabled>Sold out</Button>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-line" role="group" aria-label="Quantity">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity" className="flex h-12 w-12 items-center justify-center rounded-full text-body hover:text-primary disabled:opacity-40"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center text-sm font-semibold text-ink" aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} aria-label="Increase quantity" className="flex h-12 w-12 items-center justify-center rounded-full text-body hover:text-primary disabled:opacity-40"><Plus className="h-4 w-4" /></button>
            </div>
            <Button size="lg" className="flex-1 rounded-full" onClick={() => run("add")} disabled={busy !== null}>
              {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-5 w-5" />} {inBag > 0 ? `Add more (${inBag} in bag)` : "Add to bag"}
            </Button>
          </div>
          <Button size="lg" variant="outline" className="w-full rounded-full border-ink text-ink hover:bg-ink hover:text-card" onClick={() => run("buy")} disabled={busy !== null}>
            {busy === "buy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-5 w-5" />} Buy it now · {formatPrice(p.price * qty)}
          </Button>
        </>
      )}

      <div className="flex gap-3">
        <Button asChild variant="whatsapp" size="lg" className="flex-1 rounded-full">
          <a href={waLink(productMessage(p, { size: v.size, color: v.color }))} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="h-5 w-5" /> Order on WhatsApp</a>
        </Button>
        <WishlistButton productId={p.id} name={p.name} className="h-12 w-12 border-line" />
      </div>

      <PincodeCheck />

      {/* sticky bar for phones */}
      {!sold && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-card/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="min-w-0"><p className="text-lg font-bold leading-tight text-ink">{formatPrice(p.price)}</p>{p.mrp && p.mrp > p.price && <p className="text-xs text-slate-500 line-through">{formatPrice(p.mrp)}</p>}</div>
          <Button className="flex-1 rounded-full" size="lg" onClick={() => run("add")} disabled={busy !== null}>{busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-5 w-5" />} Add to bag</Button>
        </div>
      )}
    </div>
  );
}
