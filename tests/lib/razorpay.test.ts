import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutParams, razorpayConfigured, verifyPaymentSignature, verifyWebhookSignature } from "@/lib/razorpay";

const hmac = (secret: string, data: string) => crypto.createHmac("sha256", secret).update(data).digest("hex");

beforeEach(() => {
  vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_abc");
  vi.stubEnv("RAZORPAY_KEY_SECRET", "key_secret_123");
  vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "whsec_456");
});
afterEach(() => vi.unstubAllEnvs());

describe("payment signature (browser → server)", () => {
  const good = hmac("key_secret_123", "order_ABC|pay_XYZ");

  it("accepts a genuine signature", () => {
    expect(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_XYZ", signature: good })).toBe(true);
  });
  it("rejects a forged signature", () => {
    expect(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_XYZ", signature: hmac("wrong", "order_ABC|pay_XYZ") })).toBe(false);
    expect(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_XYZ", signature: "deadbeef" })).toBe(false);
    expect(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_XYZ", signature: "" })).toBe(false);
  });
  it("rejects a valid signature replayed with a different payment or order", () => {
    expect(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_OTHER", signature: good })).toBe(false);
    expect(verifyPaymentSignature({ orderId: "order_OTHER", paymentId: "pay_XYZ", signature: good })).toBe(false);
  });
  it("fails closed when the secret is not configured", () => {
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    expect(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_XYZ", signature: good })).toBe(false);
  });
});

describe("webhook signature (Razorpay → server)", () => {
  const body = JSON.stringify({ event: "payment.captured" });
  it("accepts a genuine signature", () => expect(verifyWebhookSignature(body, hmac("whsec_456", body))).toBe(true));
  it("uses the webhook secret, not the API secret", () => expect(verifyWebhookSignature(body, hmac("key_secret_123", body))).toBe(false));
  it("rejects a tampered body", () => expect(verifyWebhookSignature(body + " ", hmac("whsec_456", body))).toBe(false));
  it("rejects a missing signature or secret", () => {
    expect(verifyWebhookSignature(body, "")).toBe(false);
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "");
    expect(verifyWebhookSignature(body, hmac("whsec_456", body))).toBe(false);
  });
});

describe("configuration + checkout params", () => {
  it("is configured only when both keys exist", () => {
    expect(razorpayConfigured()).toBe(true);
    vi.stubEnv("RAZORPAY_KEY_SECRET", "");
    expect(razorpayConfigured()).toBe(false);
  });
  it("converts rupees to paise and never exposes the secret", () => {
    const params = checkoutParams({ razorpayOrderId: "order_1", total: 32999, orderNumber: "LC-1" }, { name: "Ravi", email: "r@x.com", phone: "9876543210" });
    expect(params.amount).toBe(3299900);
    expect(params.currency).toBe("INR");
    expect(params.keyId).toBe("rzp_test_abc");
    expect(JSON.stringify(params)).not.toContain("key_secret_123");
  });
});
