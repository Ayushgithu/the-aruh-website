import { checkoutSchema, normalizePhone } from "@/lib/validation";
import { fail, ok, readJson, userRoute } from "@/lib/api-helpers";
import { createOrderFromCart } from "@/lib/orders";
import { notifyOrder } from "@/lib/order-notify";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { HttpError } from "@/lib/api-helpers";

/** Creates the order from the customer's server-side cart (prices and stock are re-checked here). */
export const POST = userRoute(async (req, _ctx, user) => {
  if (!rateLimit(`checkout:${user.id}:${clientIp(req)}`, 20, 10 * 60_000)) return fail("Too many attempts. Please wait a few minutes.", 429);
  const v = checkoutSchema.parse(await readJson(req));
  const address = { ...v.address, phone: normalizePhone(v.address.phone), line2: v.address.line2 || undefined };
  if (user.guest && !v.email) throw new HttpError("Enter your email so we can send your order details.", 400);
  const { order, razorpay } = await createOrderFromCart(user, address, v.method, { email: v.email, useWallet: v.useWallet });

  if (v.saveAddress && !user.guest) {
    // best effort: a failure to save the address must never fail the order
    try {
      await connectDB();
      const u = await UserModel.findById(user.id);
      if (u && (u.addresses?.length ?? 0) < 8 && !u.addresses.some((a: { line1?: string; pincode?: string }) => a.line1 === address.line1 && a.pincode === address.pincode)) {
        u.addresses.push({ ...address, label: v.saveAddress.label, isDefault: !u.addresses.length });
        await u.save();
      }
    } catch { /* ignore */ }
  }

  if (!razorpay) notifyOrder("placed", order); // with an advance, the email goes out once the advance is paid
  return ok({ order: { id: String(order._id), orderNumber: order.orderNumber, total: order.total, status: order.status }, razorpay }, 201);
});
