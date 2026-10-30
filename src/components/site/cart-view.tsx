"use client";
import Link from "next/link";
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2, Truck, User } from "lucide-react";
import { useCustomer } from "@/hooks/use-customer";
import { computeTotals } from "@/lib/pricing";
import { useRules } from "@/hooks/use-rules";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemThumb } from "./order-ui";

export function useCartTotals() {
  const { cart } = useCustomer();
  const rules = useRules();
  const totals = computeTotals(cart.map((l) => ({ price: l.product.price, quantity: l.quantity })), rules);
  const problems = cart.filter((l) => l.product.available < l.quantity || l.product.available <= 0);
  return { ...totals, problems };
}

export function CartView() {
  const { ready, user, cart, setQuantity, removeFromCart, openAuth } = useCustomer();
  const t = useCartTotals();
  const FREE_SHIPPING_ABOVE = useRules().shipping.freeAbove;

  if (!ready) return <div className="container-x grid gap-4 py-10 lg:grid-cols-[1fr_22rem]"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;

  if (!user) {
    return (
      <div className="container-x flex flex-col items-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-faint text-primary"><User className="h-8 w-8" /></span>
        <h2 className="mt-5 text-2xl">Sign in to see your bag</h2>
        <p className="mt-2 max-w-sm text-sm">Your bag is saved to your account, so it is waiting for you on any device.</p>
        <Button size="lg" className="mt-6 rounded-full" onClick={() => openAuth("login")}>Sign in / Create account</Button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container-x flex flex-col items-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-faint text-primary"><ShoppingBag className="h-8 w-8" /></span>
        <h2 className="mt-5 text-2xl">Your bag is empty</h2>
        <p className="mt-2 max-w-sm text-sm">Find something you love and add it here. We will keep it for you.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-full"><Link href="/shop">Start shopping</Link></Button>
          <Button asChild size="lg" variant="outline" className="rounded-full"><Link href="/shop?sort=new">New arrivals</Link></Button>
        </div>
      </div>
    );
  }

  const toFree = Math.max(0, FREE_SHIPPING_ABOVE - t.subtotal);
  const pct = Math.min(100, Math.round((t.subtotal / FREE_SHIPPING_ABOVE) * 100));
  return (
    <div className="container-x grid gap-6 py-8 lg:grid-cols-[1fr_22rem] lg:gap-8 lg:py-12">
      <div>
        <div className="mb-4 rounded-2xl border border-line bg-card p-4 shadow-card">
          <p className="flex items-center gap-2 text-sm font-medium text-ink"><Truck className="h-4 w-4 text-primary" /> {toFree > 0 ? <>Add <strong>{formatPrice(toFree)}</strong> more for <strong>free delivery</strong></> : <>You have unlocked <strong>free delivery</strong> 🎉</>}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        </div>
        <ul className="space-y-3" aria-label="Bag items">
          {cart.map((l) => {
            const p = l.product;
            const ref = { productId: l.productId, size: l.size, color: l.color };
            const soldOut = p.available <= 0;
            const tooMany = !soldOut && l.quantity > p.available;
            const label = [l.size && `Size ${l.size}`, l.color].filter(Boolean).join(" · ");
            return (
              <li key={`${l.productId}|${l.size ?? ""}|${l.color ?? ""}`} className="rounded-2xl border border-line bg-card p-4 shadow-card">
                <div className="flex gap-4">
                  <Link href={`/product/${p.slug}`} aria-hidden tabIndex={-1}><ItemThumb item={{ image: p.images?.[0], art: p.art, name: p.name }} className="h-28 w-[5.25rem] sm:h-32 sm:w-24" /></Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${p.slug}`} className="line-clamp-2 font-semibold leading-snug text-ink hover:text-primary">{p.name}</Link>
                    {label && <p className="mt-1 text-sm">{label}</p>}
                    <p className="mt-1 text-sm font-bold text-ink">{formatPrice(p.price)}{p.mrp && p.mrp > p.price && <span className="ml-2 font-normal text-slate-500 line-through">{formatPrice(p.mrp)}</span>}</p>
                  </div>
                  <p className="hidden shrink-0 text-base font-bold text-ink sm:block">{formatPrice(p.price * l.quantity)}</p>
                </div>

                {(soldOut || tooMany) && (
                  <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {soldOut ? "This size just sold out. Please remove it to continue." : `Only ${p.available} left. Please reduce the quantity.`}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-line" role="group" aria-label={`Quantity of ${p.name}`}>
                    <button onClick={() => void setQuantity(ref, l.quantity - 1)} disabled={l.quantity <= 1} aria-label={`Decrease quantity of ${p.name}`} className="flex h-11 w-11 items-center justify-center rounded-full text-body hover:text-primary disabled:opacity-40"><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center text-sm font-semibold text-ink" aria-live="polite">{l.quantity}</span>
                    <button onClick={() => void setQuantity(ref, l.quantity + 1)} disabled={l.quantity >= Math.min(p.available, 10)} aria-label={`Increase quantity of ${p.name}`} className="flex h-11 w-11 items-center justify-center rounded-full text-body hover:text-primary disabled:opacity-40"><Plus className="h-4 w-4" /></button>
                  </div>
                  <p className="text-base font-bold text-ink sm:hidden">{formatPrice(p.price * l.quantity)}</p>
                  <Button variant="ghost" size="sm" onClick={() => void removeFromCart(ref)} aria-label={`Remove ${p.name} from bag`} className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /> Remove</Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-card p-5 shadow-card lg:sticky lg:top-28">
        <h2 className="text-lg">Order summary</h2>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-medium text-ink">{formatPrice(t.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd className="font-medium text-ink">{t.shipping === 0 ? "Free" : formatPrice(t.shipping)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-semibold text-ink">Total</dt><dd className="font-bold text-ink">{formatPrice(t.total)}</dd></div>
        </dl>
        {t.problems.length > 0 ? (
          <Button size="lg" className="mt-5 w-full rounded-full" disabled>Fix your bag to continue</Button>
        ) : (
          <Button asChild size="lg" className="mt-5 w-full rounded-full"><Link href="/checkout">Proceed to checkout</Link></Button>
        )}
        <Button asChild variant="ghost" className="mt-2 w-full"><Link href="/shop">Continue shopping</Link></Button>
        <p className="mt-3 text-center text-xs">Prices include all taxes · Easy exchange</p>
      </aside>
    </div>
  );
}
