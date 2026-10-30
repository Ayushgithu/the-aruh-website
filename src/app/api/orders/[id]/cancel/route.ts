import mongoose from "mongoose";
import { HttpError, ok, userRoute } from "@/lib/api-helpers";
import { cancelOrder } from "@/lib/orders";
import { notifyOrder } from "@/lib/order-notify";

export const POST = userRoute(async (_req, { params }, user) => {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError("Order not found.", 404);
  const order = await cancelOrder(id, { by: "customer", userId: user.id });
  notifyOrder("cancelled", order);
  return ok({ ok: true, status: order.status, paymentStatus: order.payment.status, refunded: order.payment.status === "refunded" });
});
