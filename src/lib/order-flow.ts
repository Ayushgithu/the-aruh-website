import type { OrderStatus } from "./types";

/* Which status changes are allowed (used by the dashboard buttons and checked again on the server). */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["cancelled"],
  placed: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const nextStatuses = (from: OrderStatus) => NEXT[from];
export const canTransition = (from: OrderStatus, to: OrderStatus) => NEXT[from].includes(to);
/** Customers can cancel only before the parcel is shipped. */
export const customerCanCancel = (s: OrderStatus) => s === "pending_payment" || s === "placed" || s === "confirmed";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  placed: "Order placed",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
