import { connectDB } from "@/lib/db";
import { OrderModel } from "@/models/Order";
import { verifyPaymentSchema } from "@/lib/validation";
import { HttpError, ok, readJson, userRoute } from "@/lib/api-helpers";
import { markOrderPaid } from "@/lib/orders";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { notifyOrder } from "@/lib/order-notify";

/** Called by the browser right after Razorpay reports success. We only believe it if the signature checks out. */
export const POST = userRoute(async (req, _ctx, user) => {
  const v = verifyPaymentSchema.parse(await readJson(req));
  await connectDB();
  const order = await OrderModel.findOne({ _id: v.orderId, user: user.id });
  if (!order || order.payment?.razorpayOrderId !== v.razorpay_order_id) throw new HttpError("We could not match this payment to your order.", 400);

  const valid = verifyPaymentSignature({ orderId: v.razorpay_order_id, paymentId: v.razorpay_payment_id, signature: v.razorpay_signature });
  if (!valid) throw new HttpError("Payment verification failed. If money was deducted, it will be refunded automatically — please contact us.", 400);

  const firstTime = await markOrderPaid(String(order._id), v.razorpay_payment_id);
  if (firstTime) {
    const fresh: any = await OrderModel.findById(order._id); // eslint-disable-line @typescript-eslint/no-explicit-any
    notifyOrder(fresh?.payment?.method === "cod" ? "placed" : "paid", fresh);
  }
  return ok({ ok: true, orderId: String(order._id) });
});
