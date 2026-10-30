import { Check, Circle, X } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/order-flow";
import { cn } from "@/lib/utils";
import { ProductArt } from "./product-art";

const TONE: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-50 text-amber-700 ring-amber-200",
  placed: "bg-blue-50 text-blue-700 ring-blue-200",
  confirmed: "bg-sky-50 text-sky-700 ring-sky-200",
  shipped: "bg-primary-faint text-primary ring-primary/20",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", TONE[status], className)}>{STATUS_LABEL[status]}</span>;
}

export function PaymentBadge({ order }: { order: Order }) {
  const { method, status } = order.payment;
  const label = status === "paid" ? "Paid" : status === "refunded" ? "Refunded" : status === "failed" ? "Not paid" : method === "cod" ? "Pay on delivery" : "Payment pending";
  const tone = status === "paid" ? "text-emerald-700" : status === "refunded" ? "text-sky-700" : "text-amber-700";
  return <span className={cn("text-xs font-semibold", tone)}>{method === "cod" ? "Cash on Delivery · " : method === "wallet" ? "Wallet · " : "Online · "}{label}</span>;
}

export function ItemThumb({ item, className }: { item: { image?: string; art: Order["items"][number]["art"]; name: string }; className?: string }) {
  return (
    <span className={cn("block shrink-0 overflow-hidden rounded-lg", className ?? "h-[4.5rem] w-14")} style={{ background: `hsl(${item.art.hue} 90% 95%)` }}>
      {item.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <ProductArt {...item.art} className="p-0.5" title={item.name} />}
    </span>
  );
}

const FLOW: OrderStatus[] = ["placed", "confirmed", "shipped", "delivered"];

/** Vertical timeline built from the order's recorded history. */
export function OrderTimeline({ order }: { order: Order }) {
  const done = new Map(order.timeline.map((t) => [t.status, t]));
  const steps: OrderStatus[] = order.status === "cancelled" ? [...order.timeline.map((t) => t.status).filter((s, i, a) => a.indexOf(s) === i)] : order.payment.method === "razorpay" ? ["pending_payment", ...FLOW.slice(1)] : FLOW;
  return (
    <ol className="space-y-4">
      {steps.map((s) => {
        const hit = done.get(s);
        const cancelled = s === "cancelled";
        return (
          <li key={s} className="flex gap-3">
            <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", cancelled ? "bg-red-50 text-red-600" : hit ? "bg-primary text-white" : "border border-line text-slate-500")}>
              {cancelled ? <X className="h-3.5 w-3.5" /> : hit ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
            </span>
            <div>
              <p className={cn("text-sm font-semibold", hit ? "text-ink" : "text-slate-500")}>{STATUS_LABEL[s]}</p>
              {hit && <p className="text-xs">{new Date(hit.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{hit.note ? ` · ${hit.note}` : ""}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
