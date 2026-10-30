// @vitest-environment node
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/user-auth", () => ({ getUserSession: vi.fn() }));
vi.mock("@/lib/order-notify", () => ({ notifyOrder: vi.fn() }));
vi.mock("@/lib/orders", () => ({ createOrderFromCart: vi.fn(), markOrderPaid: vi.fn(), cancelOrder: vi.fn() }));
vi.mock("@/models/Order", () => ({ OrderModel: { findOne: vi.fn(), findById: vi.fn() } }));

import { getSession } from "@/lib/auth";
import { getUserSession } from "@/lib/user-auth";
import { notifyOrder } from "@/lib/order-notify";
import { cancelOrder, createOrderFromCart, markOrderPaid } from "@/lib/orders";
import { OrderModel } from "@/models/Order";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as verify } from "@/app/api/checkout/verify/route";
import { POST as webhook } from "@/app/api/razorpay/webhook/route";
import { POST as cancel } from "@/app/api/orders/[id]/cancel/route";
import { POST as pay } from "@/app/api/orders/[id]/pay/route";
import { ID, ctx, jsonReq } from "./utils";

const Order = OrderModel as any;
const user = { id: "64b7f0c2a1b2c3d4e5f60aaa", name: "Ravi", email: "ravi@x.com", phone: "9876543210" };
const hmac = (secret: string, data: string) => crypto.createHmac("sha256", secret).update(data).digest("hex");

beforeEach(() => {
  vi.mocked(getUserSession).mockResolvedValue(user);
  vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_abc");
  vi.stubEnv("RAZORPAY_KEY_SECRET", "key_secret_123");
  vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "whsec_456");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/checkout", () => {
  const address = { name: "Ravi Kumar", phone: "+91 98765 43210", line1: "12 MG Road, Camp", city: "Pune", state: "Maharashtra", pincode: "411001" };
  const created = (status: string) => ({ order: { _id: ID, orderNumber: "LC-1", total: 5000, status }, razorpay: undefined });

  it("Cash on Delivery: builds the order from the server-side cart and emails the customer", async () => {
    vi.mocked(createOrderFromCart).mockResolvedValue(created("placed") as any);
    const res = await checkout(jsonReq("/api/checkout", "POST", { address, method: "cod" }), ctx());
    expect(res.status).toBe(201);
    expect(createOrderFromCart).toHaveBeenCalledWith(user, expect.objectContaining({ phone: "9876543210", pincode: "411001" }), "cod", { email: undefined });
    expect(notifyOrder).toHaveBeenCalledWith("placed", expect.anything());
    expect(await res.json()).toMatchObject({ order: { id: ID, orderNumber: "LC-1", status: "placed" } });
  });

  it("online payment: returns the Razorpay parameters and does not email yet", async () => {
    vi.mocked(createOrderFromCart).mockResolvedValue({ order: { _id: ID, orderNumber: "LC-1", total: 5000, status: "pending_payment" }, razorpay: { keyId: "rzp_test_abc", orderId: "order_1", amount: 500000 } } as any);
    const res = await checkout(jsonReq("/api/checkout", "POST", { address, method: "razorpay" }), ctx());
    const body = await res.json();
    expect(body.razorpay).toMatchObject({ orderId: "order_1", amount: 500000 });
    expect(JSON.stringify(body)).not.toContain("key_secret");
    expect(notifyOrder).not.toHaveBeenCalled();
  });

  it("the browser cannot choose the price: the body has no amount field and extra fields are ignored", async () => {
    vi.mocked(createOrderFromCart).mockResolvedValue(created("placed") as any);
    await checkout(jsonReq("/api/checkout", "POST", { address, method: "cod", total: 1, items: [{ price: 1 }] }), ctx());
    const args = vi.mocked(createOrderFromCart).mock.calls[0];
    expect(JSON.stringify(args)).not.toContain('"total"');
  });

  it.each([
    ["bad pincode", { address: { ...address, pincode: "12" }, method: "cod" }],
    ["bad phone", { address: { ...address, phone: "123" }, method: "cod" }],
    ["short address", { address: { ...address, line1: "x" }, method: "cod" }],
    ["unknown method", { address, method: "bitcoin" }],
  ])("400 for %s", async (_l, body) => {
    const res = await checkout(jsonReq("/api/checkout", "POST", body), ctx());
    expect(res.status).toBe(400);
    expect(createOrderFromCart).not.toHaveBeenCalled();
  });

  it("passes stock/payment problems to the customer as readable errors", async () => {
    vi.mocked(createOrderFromCart).mockRejectedValue(Object.assign(new Error("x"), { name: "HttpError" }));
    const { HttpError } = await import("@/lib/api-helpers");
    vi.mocked(createOrderFromCart).mockRejectedValue(new HttpError('Sorry, "Dell" is no longer available.', 409));
    const res = await checkout(jsonReq("/api/checkout", "POST", { address, method: "cod" }), ctx());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("no longer available");
  });
});

describe("POST /api/checkout/verify (after the customer pays)", () => {
  const sig = hmac("key_secret_123", "order_RZP|pay_1");
  const body = { orderId: ID, razorpay_order_id: "order_RZP", razorpay_payment_id: "pay_1", razorpay_signature: sig };
  beforeEach(() => { Order.findOne.mockResolvedValue({ _id: ID, user: user.id, payment: { razorpayOrderId: "order_RZP" } }); Order.findById.mockResolvedValue({ _id: ID }); });

  it("a genuine payment marks the order paid and emails the customer", async () => {
    vi.mocked(markOrderPaid).mockResolvedValue(true);
    const res = await verify(jsonReq("/api/checkout/verify", "POST", body), ctx());
    expect(res.status).toBe(200);
    expect(markOrderPaid).toHaveBeenCalledWith(ID, "pay_1");
    expect(notifyOrder).toHaveBeenCalledWith("paid", expect.anything());
  });

  it("a forged signature is rejected and nothing is marked paid", async () => {
    const res = await verify(jsonReq("/api/checkout/verify", "POST", { ...body, razorpay_signature: hmac("attacker", "order_RZP|pay_1") }), ctx());
    expect(res.status).toBe(400);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("a payment id swapped after signing is rejected", async () => {
    const res = await verify(jsonReq("/api/checkout/verify", "POST", { ...body, razorpay_payment_id: "pay_OTHER" }), ctx());
    expect(res.status).toBe(400);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("cannot pay for someone else's order (lookup is scoped to the signed-in customer)", async () => {
    Order.findOne.mockResolvedValue(null);
    const res = await verify(jsonReq("/api/checkout/verify", "POST", body), ctx());
    expect(res.status).toBe(400);
    expect(Order.findOne).toHaveBeenCalledWith({ _id: ID, user: user.id });
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("a Razorpay order id that does not belong to this order is rejected", async () => {
    const res = await verify(jsonReq("/api/checkout/verify", "POST", { ...body, razorpay_order_id: "order_ELSE", razorpay_signature: hmac("key_secret_123", "order_ELSE|pay_1") }), ctx());
    expect(res.status).toBe(400);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("calling verify twice does not send a second email", async () => {
    vi.mocked(markOrderPaid).mockResolvedValue(false);
    const res = await verify(jsonReq("/api/checkout/verify", "POST", body), ctx());
    expect(res.status).toBe(200);
    expect(notifyOrder).not.toHaveBeenCalled();
  });
});

describe("POST /api/razorpay/webhook", () => {
  const event = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_9", order_id: "order_RZP" } } } });
  const send = (raw: string, signature?: string) =>
    webhook(new Request("http://localhost/api/razorpay/webhook", { method: "POST", body: raw, headers: signature === undefined ? {} : { "x-razorpay-signature": signature } }));

  it("rejects calls without a valid signature", async () => {
    expect((await send(event)).status).toBe(400);
    expect((await send(event, hmac("wrong", event))).status).toBe(400);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("marks the order paid when Razorpay reports a captured payment (customer closed the tab early)", async () => {
    Order.findOne.mockResolvedValue({ _id: ID });
    Order.findById.mockResolvedValue({ _id: ID });
    vi.mocked(markOrderPaid).mockResolvedValue(true);
    const res = await send(event, hmac("whsec_456", event));
    expect(res.status).toBe(200);
    expect(Order.findOne).toHaveBeenCalledWith({ "payment.razorpayOrderId": "order_RZP" });
    expect(markOrderPaid).toHaveBeenCalledWith(ID, "pay_9");
    expect(notifyOrder).toHaveBeenCalledWith("paid", expect.anything());
  });

  it("ignores unrelated events and unknown orders (still 200 so Razorpay stops retrying)", async () => {
    const other = JSON.stringify({ event: "refund.processed", payload: {} });
    expect((await send(other, hmac("whsec_456", other))).status).toBe(200);
    Order.findOne.mockResolvedValue(null);
    expect((await send(event, hmac("whsec_456", event))).status).toBe(200);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("returns 500 on a server error so Razorpay retries later", async () => {
    Order.findOne.mockRejectedValue(new Error("db"));
    expect((await send(event, hmac("whsec_456", event))).status).toBe(500);
  });
});

describe("customer cancel + pay-again", () => {
  it("cancel: calls the shared cancel logic scoped to the customer and reports a refund", async () => {
    vi.mocked(cancelOrder).mockResolvedValue({ status: "cancelled", payment: { status: "refunded" } } as any);
    const res = await cancel(jsonReq(`/api/orders/${ID}/cancel`, "POST", {}), ctx({ id: ID }));
    expect(cancelOrder).toHaveBeenCalledWith(ID, { by: "customer", userId: user.id });
    expect(await res.json()).toMatchObject({ ok: true, refunded: true });
    expect(notifyOrder).toHaveBeenCalledWith("cancelled", expect.anything());
  });

  it("cancel: 404 for a malformed id", async () => {
    expect((await cancel(jsonReq("/x", "POST", {}), ctx({ id: "bad" }))).status).toBe(404);
  });

  const pending = (over: any = {}) => ({ _id: ID, user: user.id, status: "pending_payment", total: 5000, orderNumber: "LC-1", payment: { method: "razorpay", razorpayOrderId: "order_RZP" }, expiresAt: new Date(Date.now() + 600_000), ...over });
  it("pay again: returns the same Razorpay order while the window is open", async () => {
    Order.findOne.mockResolvedValue(pending());
    const body = await (await pay(jsonReq(`/api/orders/${ID}/pay`, "POST", {}), ctx({ id: ID }))).json();
    expect(body.razorpay).toMatchObject({ orderId: "order_RZP", amount: 500000 });
  });
  it("pay again: 410 once the payment window has ended", async () => {
    Order.findOne.mockResolvedValue(pending({ expiresAt: new Date(Date.now() - 1000) }));
    expect((await pay(jsonReq(`/api/orders/${ID}/pay`, "POST", {}), ctx({ id: ID }))).status).toBe(410);
  });
  it("pay again: refuses orders that are already paid or are Cash on Delivery", async () => {
    Order.findOne.mockResolvedValue(pending({ status: "confirmed" }));
    expect((await pay(jsonReq(`/api/orders/${ID}/pay`, "POST", {}), ctx({ id: ID }))).status).toBe(400);
    Order.findOne.mockResolvedValue(pending({ payment: { method: "cod" } }));
    expect((await pay(jsonReq(`/api/orders/${ID}/pay`, "POST", {}), ctx({ id: ID }))).status).toBe(400);
  });
  it("pay again: another customer's order is a 404", async () => {
    Order.findOne.mockResolvedValue(null);
    expect((await pay(jsonReq(`/api/orders/${ID}/pay`, "POST", {}), ctx({ id: ID }))).status).toBe(404);
    expect(Order.findOne).toHaveBeenCalledWith({ _id: ID, user: user.id });
  });
});
