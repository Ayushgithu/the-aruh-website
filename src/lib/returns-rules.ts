import type { Order, ReturnRequest, ReturnStatus } from "./types";
import type { StoreRules } from "./rules";

export interface ReturnableItem { index: number; remaining: number; canReturn: boolean; canExchange: boolean }
export interface Eligibility { items: ReturnableItem[]; returnOpen: boolean; exchangeOpen: boolean; closesAt?: string; message?: string }

const DAY = 86_400_000;
export const INACTIVE_RETURN: ReturnStatus[] = ["rejected", "cancelled"];

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: "Request received", approved: "Approved", rejected: "Not approved", pickup_scheduled: "Pickup scheduled",
  received: "Item received", refunded: "Refund issued", exchange_shipped: "Replacement shipped", cancelled: "Cancelled",
};

export function deliveredAt(order: Pick<Order, "deliveredAt" | "timeline">): number | null {
  const t = order.deliveredAt ?? [...order.timeline].reverse().find((x) => x.status === "delivered")?.at;
  return t ? new Date(t).getTime() : null;
}

/** What the customer can still return / exchange on a delivered order, using the owner's rules (window, switches, per-product flags). */
export function eligibility(
  order: Pick<Order, "status" | "items" | "deliveredAt" | "timeline">,
  rules: StoreRules,
  requests: Pick<ReturnRequest, "status" | "items">[],
  now = Date.now(),
): Eligibility {
  const none = (message: string): Eligibility => ({ items: [], returnOpen: false, exchangeOpen: false, message });
  const r = rules.returns;
  if (!r.enabled || (!r.allowReturn && !r.allowExchange)) return none("Returns and exchanges are not available right now.");
  if (order.status !== "delivered") return none("Returns and exchanges open once your order is delivered.");
  const at = deliveredAt(order);
  if (!at) return none("Returns and exchanges open once your order is delivered.");
  const days = (now - at) / DAY;
  const returnOpen = r.allowReturn && days <= r.returnDays;
  const exchangeOpen = r.allowExchange && days <= r.exchangeDays;
  if (!returnOpen && !exchangeOpen) return none(`The return / exchange window for this order has ended (${Math.max(r.returnDays, r.exchangeDays)} days from delivery).`);

  const used = new Map<number, number>();
  for (const q of requests) if (!INACTIVE_RETURN.includes(q.status)) for (const it of q.items) used.set(it.index, (used.get(it.index) ?? 0) + it.quantity);
  const items = order.items.map((it, index) => ({
    index,
    remaining: Math.max(0, it.quantity - (used.get(index) ?? 0)),
    canReturn: returnOpen && it.returnable !== false,
    canExchange: exchangeOpen && it.exchangeable !== false && !!it.size,
  }));
  const closes = at + DAY * Math.max(returnOpen ? r.returnDays : 0, exchangeOpen ? r.exchangeDays : 0);
  const any = items.some((i) => i.remaining > 0 && (i.canReturn || i.canExchange));
  return { items, returnOpen, exchangeOpen, closesAt: new Date(closes).toISOString(), message: any ? undefined : "The items in this order cannot be returned or exchanged." };
}
