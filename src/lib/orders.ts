import crypto from "node:crypto";
import { connectDB } from "./db";
import { CartModel } from "@/models/Cart";
import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { UserModel } from "@/models/User";
import { HttpError } from "./api-helpers";
import { codStatus, computeTotals, estimateDelivery, pincodeListed } from "./rules";
import { creditWallet, debitWallet } from "./wallet";
import { getRules } from "./settings";
import { checkoutParams, razorpay, razorpayConfigured } from "./razorpay";
import { unitsOf } from "./repo";
import { getCartLines } from "./repo-shop";
import { customerCanCancel } from "./order-flow";
import type { Address, CustomerUser, OrderStatus, PaymentMethod } from "./types";

const PAYMENT_WINDOW_MS = 30 * 60_000;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Item = { productId: string; quantity: number; name: string; size?: string };

const makeOrderNumber = () => {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${process.env.ORDER_PREFIX || "OD"}-${ymd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

/** Returns units to stock — to the exact size when the line has one. */
export async function putBack(productId: string, quantity: number, size?: string) {
  if (size) await ProductModel.updateOne({ _id: productId }, { $inc: { "sizes.$[s].qty": quantity, quantity } }, { arrayFilters: [{ "s.label": size }] });
  else await ProductModel.updateOne({ _id: productId }, { $inc: { quantity } });
}

/** Takes units out of stock atomically. If any item cannot be fully reserved, everything taken so far is put back. */
export async function reserveStock(items: Item[]) {
  const taken: Item[] = [];
  for (const it of items) {
    if (it.size) {
      // clothing: take the units out of that exact size (and out of the product total)
      const r = await ProductModel.updateOne(
        { _id: it.productId, sizes: { $elemMatch: { label: it.size, qty: { $gte: it.quantity } } } },
        { $inc: { "sizes.$.qty": -it.quantity, quantity: -it.quantity } },
      );
      if (r.modifiedCount !== 1) {
        for (const t of taken) await putBack(t.productId, t.quantity, t.size);
        throw new HttpError(`Sorry, "${it.name}" (${it.size}) is no longer available in the quantity you chose. Please update your cart.`, 409);
      }
      taken.push(it);
      continue;
    }
    // older products may not have a numeric quantity yet
    const doc = await ProductModel.findById(it.productId).select("quantity stock stockCount").lean();
    if (doc && typeof (doc as any).quantity !== "number") await ProductModel.updateOne({ _id: it.productId, quantity: { $exists: false } }, { $set: { quantity: unitsOf(doc) } });
    const res = await ProductModel.updateOne({ _id: it.productId, quantity: { $gte: it.quantity } }, { $inc: { quantity: -it.quantity } });
    if (res.modifiedCount !== 1) {
      for (const t of taken) await putBack(t.productId, t.quantity, t.size);
      throw new HttpError(`Sorry, "${it.name}" is no longer available in the quantity you chose. Please update your cart.`, 409);
    }
    taken.push(it);
  }
}

/** Puts the reserved units back — exactly once per order, even if called twice. */
export async function releaseStock(orderId: string) {
  const flagged = await OrderModel.updateOne({ _id: orderId, stockReleased: { $ne: true } }, { $set: { stockReleased: true } });
  if (flagged.modifiedCount !== 1) return;
  const order = await OrderModel.findById(orderId).select("items").lean();
  for (const i of ((order as any)?.items ?? []) as any[]) await putBack(String(i.product), i.quantity, i.size || undefined);
}

/** Unpaid online orders give their stock back after 30 minutes. Runs lazily whenever someone checks out or the admin opens Orders. */
export async function releaseExpiredOrders() {
  await connectDB();
  const stale = await OrderModel.find({ status: "pending_payment", expiresAt: { $lt: new Date() } }).select("_id").lean();
  for (const o of stale as any[]) {
    const res = await OrderModel.updateOne({ _id: o._id, status: "pending_payment" }, { $set: { status: "cancelled", "payment.status": "failed" }, $push: { timeline: { status: "cancelled", at: new Date(), note: "Payment was not completed in time" } } });
    if (res.modifiedCount === 1) { await releaseStock(String(o._id)); await refundWalletPart(String(o._id)); }
  }
}

/** Gives the wallet part of an order back to the customer — exactly once per order. */
export async function refundWalletPart(orderId: string, note = "Order was not completed", known?: number) {
  if (known === 0) return; // no wallet money was used on this order
  try {
  const flagged: any = await OrderModel.findOneAndUpdate({ _id: orderId, walletUsed: { $gt: 0 }, walletRefunded: { $ne: true } }, { $set: { walletRefunded: true } }, { new: true }).select("user walletUsed orderNumber").lean();
  if (!flagged) return;
  await creditWallet(String(flagged.user), flagged.walletUsed, { type: "order_cancelled", note: `${note} (${flagged.orderNumber})`, order: orderId });
  } catch (e) { console.error("[wallet] could not return credit:", e); }
}

/** Puts reserved cart stock back when the wallet turned out to be short (race between two checkouts). */
async function reserveStockRollback(lines: { productId: string; quantity: number; size?: string }[]) {
  for (const l of lines) await putBack(l.productId, l.quantity, l.size);
}
/** Attaches the order id to the wallet transaction that paid for it (best effort, for the history screen). */
async function WalletTxnLink(orderId: string, userId: string, orderNumber: string) {
  try { await (await import("@/models/WalletTxn")).WalletTxnModel.updateOne({ user: userId, type: "order", order: { $exists: false } }, { $set: { order: orderId, note: `Order ${orderNumber}` } }, { sort: { createdAt: -1 } } as never); } catch { /* history only */ }
}

export async function createOrderFromCart(user: CustomerUser, address: Address, method: PaymentMethod, opts: { email?: string; useWallet?: boolean } = {}) {
  await releaseExpiredOrders();
  const rules = await getRules();
  if (pincodeListed(address.pincode, rules.blockedPincodes)) throw new HttpError("Sorry, we do not deliver to this pincode yet.", 400);
  const lines = await getCartLines(user.id);
  if (!lines.length) throw new HttpError("Your cart is empty.", 400);

  // Prices always come from the database, never from the browser.
  const totals = computeTotals(lines.map((l) => ({ price: l.product.price, quantity: l.quantity })), rules);
  if (method === "cod") {
    const cod = codStatus(totals.total, address.pincode, rules);
    if (!cod.ok) throw new HttpError(cod.reason === "pincode" ? "Cash on Delivery is not available for your pincode. Please pay online." : cod.reason === "disabled" ? "Cash on Delivery is not available right now. Please pay online." : "Cash on Delivery is not available for this order value. Please pay online.", 400);
  }
  // store credit: used first; whatever is left is paid by the chosen method
  let walletUsed = 0;
  if (opts.useWallet && rules.wallet.enabled && !user.guest) {
    const u: any = await UserModel.findById(user.id).select("walletBalance").lean();
    walletUsed = Math.min(Math.max(0, Math.floor(u?.walletBalance ?? 0)), totals.total);
  }
  const remaining = totals.total - walletUsed;
  const walletOnly = walletUsed > 0 && remaining === 0;
  if (walletOnly) method = "wallet";
  // COD with an advance: the customer pays a small amount online first (cuts fake orders); the rest is paid on delivery.
  const advance = method === "cod" && rules.cod.advance > 0 && rules.cod.advance < remaining && razorpayConfigured() ? rules.cod.advance : 0;
  const payNow = method === "razorpay" ? remaining : advance;
  if (method === "razorpay" && !razorpayConfigured()) throw new HttpError("Online payment is not set up yet. Please choose Cash on Delivery or contact us.", 503);

  await reserveStock(lines.map((l) => ({ productId: l.productId, quantity: l.quantity, name: l.product.name, size: l.size })));

  const online = method === "razorpay" || advance > 0;
  if (walletUsed > 0 && !(await debitWallet(user.id, walletUsed, { type: "order", note: "Used at checkout" }))) {
    await reserveStockRollback(lines);
    throw new HttpError("Your wallet balance changed. Please review your order and try again.", 409);
  }

  // remember at purchase time whether each product allowed returns / exchanges (the owner can change it later)
  let flags = new Map<string, { returnable: boolean; exchangeable: boolean }>();
  try {
    const docs: any[] = await (ProductModel as any).find({ _id: { $in: lines.map((l) => l.productId) } }).select("returnable exchangeable").lean();
    flags = new Map(docs.map((d) => [String(d._id), { returnable: d.returnable !== false, exchangeable: d.exchangeable !== false }]));
  } catch { /* defaults to allowed */ }

  const order = await OrderModel.create({
    orderNumber: makeOrderNumber(),
    user: user.id,
    customer: { name: user.guest ? address.name : user.name, email: opts.email || user.email, phone: user.phone || address.phone }, // Google sign-ups may not have a saved number
    items: lines.map((l) => ({ product: l.productId, size: l.size, color: l.color, slug: l.product.slug, name: l.product.name, brand: l.product.brand, price: l.product.price, quantity: l.quantity, image: l.product.images?.[0], art: l.product.art, returnable: flags.get(l.productId)?.returnable ?? true, exchangeable: flags.get(l.productId)?.exchangeable ?? true })),
    ...totals,
    address,
    walletUsed, expectedBy: estimateDelivery(address.pincode, rules).to,
    payment: { method, status: walletOnly ? "paid" : "pending", paidAt: walletOnly ? new Date() : undefined, advance: advance > 0 ? { amount: advance, status: "pending" } : undefined },
    status: online ? "pending_payment" : "placed",
    expiresAt: online ? new Date(Date.now() + PAYMENT_WINDOW_MS) : undefined,
    timeline: [{ status: online ? "pending_payment" : "placed", at: new Date(), note: advance > 0 ? "Waiting for the advance payment" : online ? "Waiting for payment" : walletOnly ? "Paid with store credit" : "Cash on Delivery order placed" }],
  });

  let razorpayParams: ReturnType<typeof checkoutParams> | undefined;
  if (online) {
    try {
      const rp: any = await razorpay().orders.create({ amount: payNow * 100, currency: "INR", receipt: order.orderNumber, notes: { orderId: String(order._id) } });
      order.payment.razorpayOrderId = rp.id;
      await order.save();
      razorpayParams = checkoutParams({ razorpayOrderId: rp.id, total: payNow, orderNumber: order.orderNumber }, { name: order.customer.name, email: order.customer.email, phone: order.customer.phone });
    } catch (e) {
      order.status = "cancelled";
      order.payment.status = "failed";
      order.timeline.push({ status: "cancelled", at: new Date(), note: "Could not start payment" });
      await order.save();
      await releaseStock(String(order._id));
      await refundWalletPart(String(order._id), "Payment could not be started", walletUsed);
      console.error("[checkout] razorpay order failed:", e);
      throw new HttpError("We could not start the payment. Please try again in a moment.", 502);
    }
  } else {
    await CartModel.updateOne({ user: user.id }, { $set: { items: [] } });
  }
  if (walletUsed > 0) await WalletTxnLink(String(order._id), user.id, order.orderNumber);

  await UserModel.updateOne({ _id: user.id }, { $set: { lastAddress: address } });
  return { order, razorpay: razorpayParams };
}

/** Marks an online order as paid. Safe to call twice (browser verify + webhook). Returns true only the first time. */
export async function markOrderPaid(orderId: string, paymentId: string) {
  const now = new Date();

  // Cash-on-delivery order whose small advance was just paid: the order is now placed; the balance is paid on delivery.
  const cod: any = await OrderModel.findById(orderId).select("payment.method payment.advance status").lean();
  if (cod?.payment?.method === "cod" && cod.payment.advance?.amount) {
    const r = await OrderModel.updateOne(
      { _id: orderId, status: "pending_payment", "payment.advance.status": { $ne: "paid" } },
      { $set: { status: "placed", "payment.advance.status": "paid", "payment.advance.razorpayPaymentId": paymentId, "payment.advance.paidAt": now }, $unset: { expiresAt: "" }, $push: { timeline: { status: "placed", at: now, note: `Advance of ₹${cod.payment.advance.amount} received; the rest is paid on delivery` } } },
    );
    if (r.modifiedCount === 1) {
      const o: any = await OrderModel.findById(orderId).select("user").lean();
      if (o) await CartModel.updateOne({ user: o.user }, { $set: { items: [] } });
      return true;
    }
    return false;
  }
  const res = await OrderModel.updateOne(
    { _id: orderId, status: "pending_payment", "payment.status": { $ne: "paid" } },
    { $set: { status: "confirmed", "payment.status": "paid", "payment.razorpayPaymentId": paymentId, "payment.paidAt": now }, $unset: { expiresAt: "" }, $push: { timeline: { status: "confirmed", at: now, note: "Payment received" } } },
  );
  if (res.modifiedCount === 1) {
    const o: any = await OrderModel.findById(orderId).select("user").lean();
    if (o) await CartModel.updateOne({ user: o.user }, { $set: { items: [] } }); // bought → leaves the cart (and the admin's Carts view)
    return true;
  }

  // Paid after the order had already expired and its stock was released: try to take the stock again, else refund.
  const late: any = await OrderModel.findOne({ _id: orderId, status: "cancelled", "payment.status": { $in: ["failed", "pending"] } });
  if (!late) return false;
  try {
    await reserveStock(late.items.map((i: any) => ({ productId: String(i.product), quantity: i.quantity, name: i.name, size: i.size || undefined })));
    late.stockReleased = false;
    late.status = "confirmed";
    late.payment.status = "paid";
    late.payment.razorpayPaymentId = paymentId;
    late.payment.paidAt = now;
    late.timeline.push({ status: "confirmed", at: now, note: "Payment received after the payment window; stock was still available" });
    await late.save();
    await CartModel.updateOne({ user: late.user }, { $set: { items: [] } });
    return true;
  } catch {
    await razorpay().payments.refund(paymentId, { amount: late.total * 100 }).catch((e: unknown) => console.error("[payment] late refund failed:", e));
    late.payment.status = "refunded";
    late.payment.razorpayPaymentId = paymentId;
    late.timeline.push({ status: "cancelled", at: now, note: "Paid after the window and the item was gone; refunded" });
    await late.save();
    return false;
  }
}

/** Cancels an order: refunds a paid online order, puts the stock back, records it on the timeline. */
export async function cancelOrder(orderId: string, opts: { by: "customer" | "admin"; note?: string; userId?: string }) {
  await connectDB();
  const order: any = await OrderModel.findOne(opts.userId ? { _id: orderId, user: opts.userId } : { _id: orderId });
  if (!order) throw new HttpError("Order not found.", 404);
  if (order.status === "cancelled") throw new HttpError("This order is already cancelled.", 400);
  if (order.status === "delivered") throw new HttpError("A delivered order cannot be cancelled.", 400);
  if (opts.by === "customer" && !customerCanCancel(order.status as OrderStatus)) {
    throw new HttpError("This order has already been shipped, so it can no longer be cancelled here. Please contact us.", 400);
  }

  if (order.payment.method === "razorpay" && order.payment.status === "paid" && order.payment.razorpayPaymentId) {
    try {
      const refund: any = await razorpay().payments.refund(order.payment.razorpayPaymentId, { amount: (order.total - (order.walletUsed ?? 0)) * 100, speed: "normal", notes: { order: order.orderNumber } });
      order.payment.refundId = refund.id;
      order.payment.status = "refunded";
    } catch (e: any) {
      console.error("[cancel] refund failed:", e);
      throw new HttpError(`The refund could not be processed (${e?.error?.description ?? "payment provider error"}). The order was not cancelled.`, 502);
    }
  } else if (order.payment.method === "cod" && order.payment.advance?.status === "paid" && order.payment.advance.razorpayPaymentId) {
    // the customer's advance is returned when the order is cancelled before it ships
    try {
      const refund: any = await razorpay().payments.refund(order.payment.advance.razorpayPaymentId, { amount: order.payment.advance.amount * 100, speed: "normal", notes: { order: order.orderNumber, kind: "advance" } });
      order.payment.advance.refundId = refund.id;
      order.payment.advance.status = "refunded";
    } catch (e: any) {
      console.error("[cancel] advance refund failed:", e);
      throw new HttpError(`The advance refund could not be processed (${e?.error?.description ?? "payment provider error"}). The order was not cancelled.`, 502);
    }
  } else if (order.payment.status === "pending") {
    order.payment.status = "failed";
  }

  order.status = "cancelled";
  if (order.payment.method === "wallet" && order.payment.status === "paid") order.payment.status = "refunded";
  order.timeline.push({ status: "cancelled", at: new Date(), note: opts.note ?? (opts.by === "customer" ? "Cancelled by customer" : "Cancelled by store") });
  await order.save();
  await releaseStock(String(order._id));
  await refundWalletPart(String(order._id), "Order cancelled", order.walletUsed ?? 0);
  return order;
}
