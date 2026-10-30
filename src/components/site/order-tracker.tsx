import { CheckCircle2, MapPin, Truck } from "lucide-react";
import type { OrderStatus, Tracking, TrackingEvent } from "@/lib/types";
import { trackingUrl } from "@/lib/tracking";
import { Button } from "@/components/ui/button";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "placed", label: "Placed" }, { key: "confirmed", label: "Confirmed" }, { key: "shipped", label: "Shipped" }, { key: "delivered", label: "Delivered" },
];
const rank: Record<string, number> = { pending_payment: -1, placed: 0, confirmed: 1, shipped: 2, delivered: 3 };

/** Progress bar + courier link + live scan history. Used on the order page and the public Track page. */
export function ShipmentTracker({ status, tracking, events }: { status: OrderStatus; tracking?: Tracking | null; events?: TrackingEvent[] }) {
  if (status === "cancelled") return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">This order was cancelled.</p>;
  const at = rank[status] ?? 0;
  const url = trackingUrl(tracking);
  const feed = [...(events ?? [])].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  return (
    <div>
      <ol className="grid grid-cols-4 gap-1" aria-label="Order progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className="text-center">
            <div className="flex items-center">
              <span className={`h-1 flex-1 ${i === 0 ? "opacity-0" : i <= at ? "bg-primary" : "bg-line"}`} />
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${i <= at ? "border-primary bg-primary text-white" : "border-line bg-card text-body"}`}>{i <= at ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</span>
              <span className={`h-1 flex-1 ${i === 3 ? "opacity-0" : i < at ? "bg-primary" : "bg-line"}`} />
            </div>
            <p className={`mt-1.5 text-xs font-medium ${i <= at ? "text-ink" : ""}`}>{s.label}</p>
          </li>
        ))}
      </ol>

      {tracking?.number && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-faint p-4">
          <p className="flex items-start gap-2 text-sm"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{tracking.carrier || "Courier"} · AWB <strong className="text-ink">{tracking.number}</strong></span></p>
          {url && <Button asChild size="sm" className="rounded-full"><a href={url} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4" /> Track on courier site</a></Button>}
        </div>
      )}

      {feed.length > 0 && (
        <ul className="mt-5 space-y-3 border-l-2 border-line pl-4" aria-label="Shipment updates">
          {feed.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-semibold text-ink">{e.status}</p>
              <p className="text-xs">{new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{e.location ? ` · ${e.location}` : ""}</p>
              {e.note && <p className="text-xs">{e.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
