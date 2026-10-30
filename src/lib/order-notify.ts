import { after } from "next/server";
import { sendOrderEmail, type OrderEmailKind } from "./email";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Emails the customer after the response has been sent. A failed email never fails the order. */
export function notifyOrder(kind: OrderEmailKind, order: any) {
  after(async () => {
    try {
      await sendOrderEmail(kind, {
        orderNumber: order.orderNumber, total: order.total, shipping: order.shipping, subtotal: order.subtotal, status: order.status,
        customer: { name: order.customer?.name ?? "", email: order.customer?.email ?? "" },
        items: (order.items ?? []).map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        payment: { method: order.payment?.method, status: order.payment?.status },
        tracking: order.tracking?.number ? { carrier: order.tracking.carrier ?? "", number: order.tracking.number } : undefined,
      }, String(order._id));
    } catch (e) {
      console.error("[order-email] failed:", e instanceof Error ? e.message : e);
    }
  });
}
