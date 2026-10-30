import crypto from "node:crypto";
import Razorpay from "razorpay";
import { HttpError } from "./api-helpers";

export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

let client: Razorpay | null = null;
export function razorpay(): Razorpay {
  if (!razorpayConfigured()) throw new HttpError("Online payment is not set up yet. Please choose Cash on Delivery or contact us.", 503);
  return (client ??= new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! }));
}

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Checks the signature Razorpay returns to the browser after a successful payment. Never trust the browser without this. */
export function verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Checks the X-Razorpay-Signature header on webhook calls (uses the separate webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Parameters the browser needs to open the Razorpay payment window. */
export function checkoutParams(order: { razorpayOrderId: string; total: number; orderNumber: string }, customer: { name: string; email: string; phone: string }) {
  return {
    keyId: process.env.RAZORPAY_KEY_ID!,
    orderId: order.razorpayOrderId,
    amount: order.total * 100, // paise
    currency: "INR",
    description: `Order ${order.orderNumber}`,
    prefill: { name: customer.name, email: customer.email, contact: customer.phone },
  };
}
