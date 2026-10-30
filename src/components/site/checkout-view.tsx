"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Banknote, CreditCard, Loader2, Lock, MapPin, ShieldCheck, Smartphone, Truck, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { addressSchema, INDIAN_STATES } from "@/lib/validation";
import { codStatus, deliveryText, estimateDelivery, pincodeListed } from "@/lib/rules";
import { postJson } from "@/lib/api";
import { openRazorpay, type RzpParams } from "@/lib/razorpay-client";
import { cn, formatPrice } from "@/lib/utils";
import type { SavedAddress } from "@/lib/types";
import { useCustomer } from "@/hooks/use-customer";
import { useRules } from "@/hooks/use-rules";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemThumb } from "./order-ui";
import { useCartTotals } from "./cart-view";

type Values = z.input<typeof addressSchema>;
type Pay = "upi" | "online" | "cod";
interface CheckoutResponse { order: { id: string; orderNumber: string; total: number }; razorpay?: RzpParams }
const EMPTY: Values = { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };
const LABELS = ["Home", "Work", "Other"];

export function CheckoutView({ saved, addresses = [], onlineEnabled, wallet = 0 }: { saved: Values | null; addresses?: SavedAddress[]; onlineEnabled: boolean; wallet?: number }) {
  const router = useRouter();
  const rules = useRules();
  const { ready, user, cart, refresh, openAuth } = useCustomer();
  const t = useCartTotals();
  const [pay, setPay] = React.useState<Pay>(onlineEnabled ? "upi" : "cod");
  const [busy, setBusy] = React.useState(false);
  const [picked, setPicked] = React.useState<string>(() => (addresses.find((a) => a.isDefault) ?? addresses[0])?.id ?? "new");
  const [email, setEmail] = React.useState("");
  const [emailErr, setEmailErr] = React.useState("");
  const [saveAs, setSaveAs] = React.useState<string | null>(null);
  const [useWallet, setUseWallet] = React.useState(true);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<Values>({ resolver: zodResolver(addressSchema), defaultValues: saved ?? EMPTY });
  React.useEffect(() => { if (user && !saved) reset({ ...EMPTY, name: user.guest ? "" : user.name, phone: user.phone }); }, [user, saved, reset]);

  const chosen = addresses.find((a) => a.id === picked);
  const pincode = chosen ? chosen.pincode : watch("pincode");
  const cod = codStatus(t.total, pincode, rules);
  const blocked = /^\d{6}$/.test(pincode ?? "") && pincodeListed(pincode, rules.blockedPincodes);
  const walletUsed = useWallet && wallet > 0 ? Math.min(Math.floor(wallet), t.total) : 0;
  const remaining = t.total - walletUsed;
  const walletOnly = walletUsed > 0 && remaining === 0;
  const advance = rules.cod.advance > 0 && rules.cod.advance < remaining && onlineEnabled ? rules.cod.advance : 0;
  const eta = /^\d{6}$/.test(pincode ?? "") ? deliveryText(estimateDelivery(pincode, rules)) : null;
  const isGuest = !!user?.guest;

  React.useEffect(() => { if (pay === "cod" && !cod.ok && onlineEnabled) setPay("upi"); }, [pay, cod.ok, onlineEnabled]);

  if (!ready) return <div className="container-x grid gap-4 py-10 lg:grid-cols-[1fr_24rem]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>;

  if (!user) {
    return (
      <div className="container-x flex flex-col items-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-faint text-primary"><User className="h-8 w-8" /></span>
        <h2 className="mt-5 text-2xl">Your bag is empty</h2>
        <p className="mt-2 max-w-sm text-sm">Add something to your bag first{rules.guestCheckout ? " — you can check out without creating an account." : ", then sign in to check out."}</p>
        <div className="mt-6 flex gap-3"><Button asChild size="lg" className="rounded-full"><Link href="/shop">Start shopping</Link></Button>{!rules.guestCheckout && <Button size="lg" variant="outline" className="rounded-full" onClick={() => openAuth("login")}>Sign in</Button>}</div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container-x flex flex-col items-center py-16 text-center">
        <h2 className="text-2xl">Nothing to check out</h2>
        <p className="mt-2 text-sm">Your bag is empty.</p>
        <Button asChild size="lg" className="mt-6"><Link href="/shop">Browse styles</Link></Button>
      </div>
    );
  }

  const goToOrder = async (id: string, placed = true) => { await refresh(); router.push(`/account/orders/${id}${placed ? "?placed=1" : ""}`); };
  const method = pay === "cod" ? "cod" : "razorpay";

  const place = async (address: Values) => {
    if (t.problems.length) { toast.error("Please fix your bag first", { description: "Some items are sold out or low in stock." }); router.push("/cart"); return; }
    if (blocked) { toast.error("We do not deliver to this pincode yet"); return; }
    if (isGuest && !/^\S+@\S+\.\S+$/.test(email.trim())) { setEmailErr("Enter your email so we can send your order details"); return; }
    setEmailErr("");
    setBusy(true);
    try {
      const res = await postJson<CheckoutResponse>("/api/checkout", { address, method, email: isGuest ? email.trim() : undefined, saveAddress: !chosen && saveAs && !isGuest ? { label: saveAs } : undefined, useWallet: walletUsed > 0 ? true : undefined });
      if (!res.razorpay) { toast.success("Order placed", { description: `Order ${res.order.orderNumber}` }); await goToOrder(res.order.id); return; }

      await openRazorpay(res.razorpay, {
        onPaid: async (r) => {
          try {
            await postJson("/api/checkout/verify", { orderId: res.order.id, ...r });
            toast.success(method === "cod" ? "Advance received — order placed" : "Payment successful", { description: `Order ${res.order.orderNumber} is confirmed` });
            await goToOrder(res.order.id);
          } catch (e) {
            toast.error("We could not confirm your payment", { description: e instanceof Error ? e.message : "Please check My Orders." });
            await goToOrder(res.order.id, false);
          }
        },
        onDismiss: async () => {
          toast("Payment not completed", { description: "Your items are reserved for 30 minutes. You can pay from your order page." });
          await goToOrder(res.order.id, false);
        },
        onFailed: (m) => { toast.error("Payment failed", { description: m }); setBusy(false); },
      }, { upiFirst: pay === "upi" });
      return;
    } catch (e) {
      toast.error("Could not place your order", { description: e instanceof Error ? e.message : "Please try again." });
    }
    setBusy(false);
  };

  const onSubmit = (v: Values) => place(v);
  const submitSaved = () => chosen && place({ name: chosen.name, phone: chosen.phone, line1: chosen.line1, line2: chosen.line2 ?? "", city: chosen.city, state: chosen.state, pincode: chosen.pincode });

  const radio = (on: boolean, disabled = false) => cn("flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition", on ? "border-primary bg-primary-faint" : "border-line hover:border-primary/40", disabled && "cursor-not-allowed opacity-60");
  const payLabel = walletOnly ? `Place order · paid with wallet` : pay === "cod" ? (advance > 0 ? `Pay ${formatPrice(advance)} advance & place order` : `Place order · ${formatPrice(remaining)}`) : `Pay ${formatPrice(remaining)}`;

  return (
    <form onSubmit={chosen ? (e) => { e.preventDefault(); void submitSaved(); } : handleSubmit(onSubmit)} noValidate className="container-x grid gap-6 py-8 lg:grid-cols-[1fr_24rem] lg:gap-8 lg:py-12">
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6" aria-labelledby="addr">
          <h2 id="addr" className="text-lg">1. Delivery address</h2>

          {isGuest && (
            <div className="mt-4 rounded-xl bg-surface p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink"><User className="h-4 w-4 text-primary" /> Checking out as a guest</p>
              <Field label="Your email (for the order confirmation)" error={emailErr} className="mt-3"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!emailErr} /></Field>
              <p className="mt-2 text-xs">Already have an account? <button type="button" onClick={() => openAuth("login")} className="font-semibold text-primary hover:underline">Sign in</button> — your bag will come with you. You can track this order any time at <Link href="/track" className="font-semibold text-primary hover:underline">Track order</Link>.</p>
            </div>
          )}

          {addresses.length > 0 && (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
              {addresses.map((a) => (
                <li key={a.id}>
                  <label className={radio(picked === a.id)}>
                    <input type="radio" name="addr" checked={picked === a.id} onChange={() => setPicked(a.id)} className="mt-1 h-4 w-4 accent-primary" />
                    <span className="text-sm"><span className="flex items-center gap-2 font-semibold text-ink"><MapPin className="h-4 w-4 text-primary" /> {a.label}</span><span className="mt-1 block">{a.name}, {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.pincode}</span></span>
                  </label>
                </li>
              ))}
              <li><label className={radio(picked === "new")}><input type="radio" name="addr" checked={picked === "new"} onChange={() => setPicked("new")} className="mt-1 h-4 w-4 accent-primary" /><span className="text-sm font-semibold text-ink">+ Use a new address</span></label></li>
            </ul>
          )}

          {!chosen && (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Receiver's name" error={errors.name?.message}><Input autoComplete="name" aria-invalid={!!errors.name} {...register("name")} /></Field>
                <Field label="Mobile number" error={errors.phone?.message}><Input type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} /></Field>
                <Field label="House / flat, street" error={errors.line1?.message} className="sm:col-span-2"><Input autoComplete="address-line1" aria-invalid={!!errors.line1} {...register("line1")} /></Field>
                <Field label="Landmark / area (optional)" error={errors.line2?.message} className="sm:col-span-2"><Input autoComplete="address-line2" {...register("line2")} /></Field>
                <Field label="City" error={errors.city?.message}><Input autoComplete="address-level2" aria-invalid={!!errors.city} {...register("city")} /></Field>
                <Field label="State" error={errors.state?.message}>
                  <Select autoComplete="address-level1" aria-invalid={!!errors.state} {...register("state")}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="Pincode" error={errors.pincode?.message}><Input inputMode="numeric" autoComplete="postal-code" maxLength={6} aria-invalid={!!errors.pincode} {...register("pincode")} /></Field>
              </div>
              {!isGuest && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-ink">Save this address as:</span>
                  {LABELS.map((l) => <button key={l} type="button" aria-pressed={saveAs === l} onClick={() => setSaveAs(saveAs === l ? null : l)} className={cn("rounded-full border px-3.5 py-1 font-medium", saveAs === l ? "border-ink bg-ink text-card" : "border-line text-ink hover:border-ink")}>{l}</button>)}
                </div>
              )}
            </>
          )}
          {eta && !blocked && <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"><Truck className="h-4 w-4 shrink-0" /> Get it by <strong>{eta.by}</strong>{eta.range !== eta.by && <span className="font-normal"> (between {eta.range})</span>}</p>}
          {blocked && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Sorry, we do not deliver to pincode {pincode} yet.</p>}
        </section>

        <section className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6" aria-labelledby="pay">
          <h2 id="pay" className="text-lg">2. Payment</h2>
          {wallet > 0 && (
            <label className={cn("mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-4", useWallet ? "border-primary bg-primary-faint" : "border-line")}>
              <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
              <span className="flex-1 text-sm"><span className="flex items-center gap-2 font-semibold text-ink"><Wallet className="h-4 w-4 text-primary" /> Use my wallet balance</span><span className="mt-0.5 block">You have <strong className="text-ink">{formatPrice(Math.floor(wallet))}</strong> in store credit{walletUsed > 0 ? <> — <strong className="text-ink">{formatPrice(walletUsed)}</strong> will be used.</> : "."}</span></span>
            </label>
          )}
          {walletOnly ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Your wallet covers the whole order — nothing more to pay.</p> : (
          <fieldset className="mt-5 space-y-3">
            <legend className="sr-only">Payment method</legend>
            <label className={radio(pay === "upi", !onlineEnabled)}>
              <input type="radio" name="method" value="upi" checked={pay === "upi"} disabled={!onlineEnabled} onChange={() => setPay("upi")} className="mt-1 h-4 w-4 accent-primary" />
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2 font-semibold text-ink"><Smartphone className="h-4 w-4 text-primary" /> Pay with UPI <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Fastest</span></span>
                <span className="mt-0.5 block text-sm">GPay, PhonePe, Paytm or any UPI app — one tap on your phone.</span>
                {!onlineEnabled && <span className="mt-1 block text-xs font-medium text-amber-700">Online payment is not available right now.</span>}
              </span>
            </label>
            <label className={radio(pay === "online", !onlineEnabled)}>
              <input type="radio" name="method" value="online" checked={pay === "online"} disabled={!onlineEnabled} onChange={() => setPay("online")} className="mt-1 h-4 w-4 accent-primary" />
              <span className="flex-1"><span className="flex items-center gap-2 font-semibold text-ink"><CreditCard className="h-4 w-4 text-primary" /> Pay online</span><span className="mt-0.5 block text-sm">Debit/credit cards, netbanking and wallets, securely via Razorpay.</span></span>
            </label>
            <label className={radio(pay === "cod", !cod.ok)}>
              <input type="radio" name="method" value="cod" checked={pay === "cod"} disabled={!cod.ok} onChange={() => setPay("cod")} className="mt-1 h-4 w-4 accent-primary" />
              <span className="flex-1">
                <span className="flex items-center gap-2 font-semibold text-ink"><Banknote className="h-4 w-4 text-primary" /> Cash on Delivery</span>
                <span className="mt-0.5 block text-sm">{advance > 0 ? <>Pay <strong className="text-ink">{formatPrice(advance)}</strong> now to confirm your order and the remaining <strong className="text-ink">{formatPrice(remaining - advance)}</strong> in cash on delivery.</> : "Pay in cash when your order arrives."}</span>
                {!cod.ok && <span className="mt-1 block text-xs font-medium text-amber-700">{cod.reason === "pincode" ? "Cash on Delivery is not available for this pincode." : cod.reason === "disabled" ? "Cash on Delivery is not available right now." : `Available for orders up to ${formatPrice(rules.cod.max)}.`}</span>}
              </span>
            </label>
          </fieldset>
          )}
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-card p-5 shadow-card lg:sticky lg:top-24">
        <h2 className="text-lg">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {cart.map((l) => (
            <li key={`${l.productId}|${l.size ?? ""}|${l.color ?? ""}`} className="flex items-center gap-3">
              <ItemThumb item={{ image: l.product.images?.[0], art: l.product.art, name: l.product.name }} />
              <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-medium text-ink">{l.product.name}</p><p className="text-xs">{[l.size && `Size ${l.size}`, l.color, `Qty ${l.quantity}`].filter(Boolean).join(" · ")}</p></div>
              <p className="text-sm font-semibold text-ink">{formatPrice(l.product.price * l.quantity)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-medium text-ink">{formatPrice(t.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd className="font-medium text-ink">{t.shipping === 0 ? "Free" : formatPrice(t.shipping)}</dd></div>
          {walletUsed > 0 && <div className="flex justify-between text-emerald-700"><dt>Wallet credit</dt><dd className="font-medium">−{formatPrice(walletUsed)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-3 text-base"><dt className="font-semibold text-ink">{walletUsed > 0 ? "To pay" : "Total"}</dt><dd className="font-bold text-ink">{formatPrice(remaining)}</dd></div>
          {pay === "cod" && !walletOnly && advance > 0 && <div className="flex justify-between text-xs"><dt>Pay on delivery</dt><dd className="font-medium text-ink">{formatPrice(remaining - advance)}</dd></div>}
        </dl>
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy || blocked}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : walletOnly || (pay === "cod" && advance === 0) ? payLabel : <><Lock className="h-4 w-4" /> {payLabel}</>}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Secure checkout{rules.returns.enabled ? ` · ${Math.max(rules.returns.returnDays, rules.returns.exchangeDays)}-day returns & exchange` : ""}</p>
        <Button asChild variant="ghost" size="sm" className="mt-1 w-full"><Link href="/cart">Back to bag</Link></Button>
      </aside>
    </form>
  );
}
