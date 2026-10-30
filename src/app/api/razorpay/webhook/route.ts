import { connectDB } from "@/lib/db";
import { OrderModel } from "@/models/Order";
import { markOrderPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { notifyOrder } from "@/lib/order-notify";

/* Safety net: if a customer pays and then closes the tab before our /verify call, Razorpay tells us here.
   Dashboard → Settings → Webhooks → URL: https://YOUR-SITE/api/razorpay/webhook, events: payment.captured, order.paid. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) return new Response("Invalid signature", { status: 400 });

  try {
    const event = JSON.parse(raw);
    const payment = event?.payload?.payment?.entity;
    if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id && payment?.id) {
      await connectDB();
      const order = await OrderModel.findOne({ "payment.razorpayOrderId": payment.order_id });
      if (order && (await markOrderPaid(String(order._id), payment.id))) notifyOrder("paid", await OrderModel.findById(order._id));
    }
  } catch (e) {
    console.error("[razorpay webhook]", e);
    return new Response("Error", { status: 500 }); // Razorpay will retry
  }
  return new Response("ok");
}
