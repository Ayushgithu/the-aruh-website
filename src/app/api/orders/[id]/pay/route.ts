import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { OrderModel } from "@/models/Order";
import { HttpError, ok, userRoute } from "@/lib/api-helpers";
import { checkoutParams, razorpayConfigured } from "@/lib/razorpay";

/** "Pay now" again for an unpaid online order (payment window still open). */
export const POST = userRoute(async (_req, { params }, user) => {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError("Order not found.", 404);
  await connectDB();
  const order = await OrderModel.findOne({ _id: id, user: user.id });
  if (!order) throw new HttpError("Order not found.", 404);
  if (order.status !== "pending_payment" || order.payment.method !== "razorpay" || !order.payment.razorpayOrderId) throw new HttpError("This order does not need a payment.", 400);
  if (order.expiresAt && order.expiresAt < new Date()) throw new HttpError("The payment window for this order has ended. Please place the order again.", 410);
  if (!razorpayConfigured()) throw new HttpError("Online payment is not set up yet.", 503);
  return ok({ razorpay: checkoutParams({ razorpayOrderId: order.payment.razorpayOrderId, total: order.total, orderNumber: order.orderNumber }, user), orderId: String(order._id) });
});
