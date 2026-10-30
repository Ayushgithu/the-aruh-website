import { notFound } from "next/navigation";
import { requireUser } from "@/lib/user-auth";
import { getUserOrder } from "@/lib/repo-shop";
import { formatPrice } from "@/lib/utils";
import { site } from "@/lib/site";
import { PrintButton } from "@/components/site/order-actions";

export const metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}/invoice`);
  const o = await getUserOrder(id, user.id);
  if (!o) notFound();

  return (
    <div className="space-y-4">
      <PrintButton />
      <article className="rounded-2xl border border-line bg-card p-6 shadow-card print:border-0 print:p-0 print:shadow-none sm:p-8" aria-label={`Invoice ${o.orderNumber}`}>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="font-serif text-xl font-semibold text-ink">{site.name}</p>
            <p className="mt-1 text-xs">{site.address.join(", ")}<br />{site.phone} · {site.email}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-bold text-ink">INVOICE</p>
            <p>{o.orderNumber}</p>
            <p>{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </header>
        <section className="grid gap-4 py-5 text-sm sm:grid-cols-2">
          <div><p className="text-xs font-semibold">Billed to</p><p className="font-semibold text-ink">{o.customer.name}</p><p>{o.customer.email}<br />{o.customer.phone}</p></div>
          <div><p className="text-xs font-semibold">Ship to</p><p className="font-semibold text-ink">{o.address.name}</p><p>{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p></div>
        </section>
        <table className="w-full text-sm">
          <thead><tr className="border-y border-line text-left text-xs"><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.productId} className="border-b border-line"><td className="py-2.5 pr-2 text-ink">{i.name}{i.size ? ` (${i.size}${i.color ? `, ${i.color}` : ""})` : ""}</td><td className="py-2.5 text-right">{i.quantity}</td><td className="py-2.5 text-right">{formatPrice(i.price)}</td><td className="py-2.5 text-right font-medium text-ink">{formatPrice(i.price * i.quantity)}</td></tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(o.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{o.shipping ? formatPrice(o.shipping) : "Free"}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-ink"><dt>Total (incl. all taxes)</dt><dd>{formatPrice(o.total)}</dd></div>
        </dl>
        <p className="mt-6 text-xs">Payment: {o.payment.method === "cod" ? "Cash on Delivery" : "Online (Razorpay)"} · {o.payment.status === "paid" ? "Paid" : o.payment.status === "refunded" ? "Refunded" : "Not yet paid"}{o.payment.razorpayPaymentId ? ` · Ref ${o.payment.razorpayPaymentId}` : ""}</p>
      </article>
    </div>
  );
}
