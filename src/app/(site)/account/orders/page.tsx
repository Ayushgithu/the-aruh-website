import Link from "next/link";
import { Package } from "lucide-react";
import { requireUser } from "@/lib/user-auth";
import { getUserOrders } from "@/lib/repo-shop";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ItemThumb, OrderStatusBadge, PaymentBadge } from "@/components/site/order-ui";

export const metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await getUserOrders(user.id);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-faint text-primary"><Package className="h-8 w-8" /></span>
        <h2 className="mt-5 text-xl">No orders yet</h2>
        <p className="mt-2 text-sm">When you buy something, you can track it here.</p>
        <Button asChild className="mt-6"><Link href="/shop">Browse styles</Link></Button>
      </div>
    );
  }

  return (
    <ul className="space-y-4" aria-label="Orders">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/account/orders/${o.id}`} className="block rounded-2xl border border-line bg-card p-4 shadow-card transition hover:border-primary/40 hover:shadow-lift sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">Order {o.orderNumber}</p>
                <p className="text-xs">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s)</p>
              </div>
              <OrderStatusBadge status={o.status} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-2">{o.items.slice(0, 4).map((i) => <ItemThumb key={i.productId} item={i} className="h-12 w-16 ring-2 ring-card" />)}</div>
              <p className="line-clamp-1 flex-1 text-sm">{o.items.map((i) => i.name).join(", ")}</p>
              <p className="shrink-0 font-bold text-ink">{formatPrice(o.total)}</p>
            </div>
            <p className="mt-3"><PaymentBadge order={o} /></p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
