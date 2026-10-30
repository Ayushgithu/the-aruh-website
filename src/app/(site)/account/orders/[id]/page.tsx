import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, MapPin, Truck } from "lucide-react";
import { requireUser } from "@/lib/user-auth";
import { getUserOrder } from "@/lib/repo-shop";
import { razorpayConfigured } from "@/lib/razorpay";
import { formatPrice } from "@/lib/utils";
import { ItemThumb, OrderStatusBadge, OrderTimeline, PaymentBadge } from "@/components/site/order-ui";
import { OrderActions } from "@/components/site/order-actions";
import { ShipmentTracker } from "@/components/site/order-tracker";
import { ReturnPanel } from "@/components/site/return-panel";
import { getRules } from "@/lib/settings";
import { dayLabel } from "@/lib/rules";
import { eligibility } from "@/lib/returns-rules";
import { getOrderReturns, getSizesFor } from "@/lib/repo-returns";

export const metadata = { title: "Order details" };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  const order = await getUserOrder(id, user.id);
  if (!order) notFound();
  const placed = (await searchParams).placed === "1";
  const [rules, returns] = await Promise.all([getRules(), getOrderReturns(id, user.id)]);
  const el = eligibility(order, rules, returns);
  const sizes = await getSizesFor([...new Set(order.items.map((i) => i.productId))]);
  const adv = order.payment.method === "cod" ? order.payment.advance : undefined;
  const paidOnline = order.payment.method === "razorpay" && order.payment.status === "paid";

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex min-h-9 items-center gap-1 text-sm font-medium hover:text-primary"><ChevronLeft className="h-4 w-4" /> All orders</Link>

      {placed && order.status !== "cancelled" && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{order.status === "pending_payment" ? "Order created — payment pending" : paidOnline ? "Payment received — thank you!" : "Order placed — thank you!"}</p>
            <p className="text-sm">{order.status === "pending_payment" ? "Complete the payment below within 30 minutes to confirm it." : "We have emailed you the details. We will update this page as your order moves."}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl">Order {order.orderNumber}</h2>
          <p className="text-sm">Placed on {new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}</p>
        </div>
        <OrderStatusBadge status={order.status} className="text-sm" />
      </div>

      <OrderActions order={order} onlineEnabled={razorpayConfigured()} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-line bg-card p-5 shadow-card" aria-labelledby="items">
          <h3 id="items" className="text-base font-semibold">Items</h3>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((i) => (
              <li key={`${i.productId}|${i.size ?? ""}|${i.color ?? ""}`} className="flex items-center gap-3 py-3">
                <ItemThumb item={i} className="h-16 w-20" />
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${i.slug}`} className="line-clamp-2 text-sm font-semibold text-ink hover:text-primary">{i.name}</Link>
                  <p className="text-xs">{[i.size && `Size ${i.size}`, i.color, `Qty ${i.quantity}`].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="text-sm font-bold text-ink">{formatPrice(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-medium text-ink">{formatPrice(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd className="font-medium text-ink">{order.shipping ? formatPrice(order.shipping) : "Free"}</dd></div>
            <div className="flex justify-between text-base"><dt className="font-semibold text-ink">Total</dt><dd className="font-bold text-ink">{formatPrice(order.total)}</dd></div>
          </dl>
          <p className="mt-3"><PaymentBadge order={order} /></p>
          {(order.walletUsed ?? 0) > 0 && <p className="mt-2 text-sm">Paid from wallet: <strong className="text-ink">{formatPrice(order.walletUsed!)}</strong></p>}
          {adv && adv.status !== "pending" && <p className="mt-2 text-sm">{adv.status === "refunded" ? <>Advance of <strong className="text-ink">{formatPrice(adv.amount)}</strong> refunded.</> : <>Advance paid: <strong className="text-ink">{formatPrice(adv.amount)}</strong> · Pay <strong className="text-ink">{formatPrice(order.total - adv.amount)}</strong> on delivery.</>}</p>}
        </section>

        <div className="space-y-6">
          {(order.status === "delivered" || returns.length > 0) && <ReturnPanel order={order} requests={returns} eligibility={el} reasons={rules.returns.reasons} note={rules.returns.note} sizes={sizes} wallet={{ enabled: rules.wallet.enabled && !user.guest, bonusPercent: rules.wallet.bonusPercent }} />}
          <section className="rounded-2xl border border-line bg-card p-5 shadow-card" aria-labelledby="progress">
            <h3 id="progress" className="mb-4 text-base font-semibold">Order progress</h3>
            {order.expectedBy && ["placed", "confirmed", "shipped"].includes(order.status) && <p className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"><Truck className="h-4 w-4" /> Expected by {dayLabel(order.expectedBy)}</p>}
            {order.status === "pending_payment" || order.status === "cancelled" ? <OrderTimeline order={order} /> : <ShipmentTracker status={order.status} tracking={order.tracking} events={order.trackingEvents} />}
            {(order.status === "pending_payment" || order.status === "cancelled") && order.tracking && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-primary-faint px-3 py-2 text-sm"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{order.tracking.carrier || "Courier"} · Tracking no. <strong className="font-semibold text-ink">{order.tracking.number}</strong></span></p>
            )}
          </section>
          <section className="rounded-2xl border border-line bg-card p-5 shadow-card" aria-labelledby="ship">
            <h3 id="ship" className="flex items-center gap-2 text-base font-semibold"><MapPin className="h-4 w-4 text-primary" /> Delivery address</h3>
            <address className="mt-3 text-sm not-italic leading-relaxed">
              <strong className="font-semibold text-ink">{order.address.name}</strong><br />
              {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}<br />
              {order.address.city}, {order.address.state} {order.address.pincode}<br />
              Phone: {order.address.phone}
            </address>
          </section>
        </div>
      </div>
    </div>
  );
}
