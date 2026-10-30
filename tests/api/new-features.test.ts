// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/user-auth", () => ({ getUserSession: vi.fn(), createUserSession: vi.fn() }));
const box = vi.hoisted(() => ({ rules: null as any }));
vi.mock("@/lib/settings", () => ({ getRules: async () => box.rules }));
vi.mock("@/lib/return-notify", () => ({ notifyReturn: vi.fn() }));
vi.mock("@/models/User", () => ({ UserModel: { create: vi.fn(), findById: vi.fn(), updateOne: vi.fn() } }));
vi.mock("@/models/Order", () => ({ OrderModel: { findOne: vi.fn() } }));
vi.mock("@/models/ReturnRequest", () => ({ ReturnModel: { create: vi.fn(), find: vi.fn(), updateOne: vi.fn() } }));
vi.mock("@/models/PushSub", () => ({ PushSubModel: { updateOne: vi.fn(), deleteOne: vi.fn() } }));
vi.mock("@/lib/repo-returns", async (orig) => ({ ...(await orig<typeof import("@/lib/repo-returns")>()), getOrderReturns: vi.fn(async () => []), getSizesFor: vi.fn(async () => ({ "64b7f0c2a1b2c3d4e5f60001": [{ label: "S", qty: 0 }, { label: "M", qty: 3 }, { label: "L", qty: 4 }] })) }));

import { getUserSession, createUserSession } from "@/lib/user-auth";
import { UserModel } from "@/models/User";
import { OrderModel } from "@/models/Order";
import { ReturnModel } from "@/models/ReturnRequest";
import { PushSubModel } from "@/models/PushSub";
import { mergeRules } from "@/lib/rules";
import { POST as guest } from "@/app/api/auth/guest/route";
import { POST as track } from "@/app/api/track/route";
import { GET as pincode } from "@/app/api/pincode/route";
import { POST as createReturn } from "@/app/api/orders/[id]/returns/route";
import { POST as pushSub } from "@/app/api/push/subscribe/route";
import { ID, ctx, jsonReq } from "./utils";

const User = UserModel as any, Order = OrderModel as any, Return = ReturnModel as any, Push = PushSubModel as any;
const user = { id: "64b7f0c2a1b2c3d4e5f60aaa", name: "Ravi", email: "r@x.com", phone: "9876543210" };

beforeEach(() => {
  box.rules = mergeRules(null);
  vi.mocked(getUserSession).mockResolvedValue(user as any);
  vi.mocked(createUserSession).mockClear();
  User.create.mockReset(); Order.findOne.mockReset(); Return.create.mockReset(); Push.updateOne.mockReset();
});

describe("POST /api/auth/guest", () => {
  it("creates a throw-away account that can never sign in with a password, and starts a session", async () => {
    vi.mocked(getUserSession).mockResolvedValue(null);
    User.create.mockImplementation(async (d: any) => ({ _id: "64b7f0c2a1b2c3d4e5f60bbb", ...d }));
    const res = await guest(jsonReq("/api/auth/guest", "POST", {}), ctx());
    expect(res.status).toBe(201);
    const saved = User.create.mock.calls[0][0];
    expect(saved).toMatchObject({ guest: true, name: "Guest" });
    expect(saved.email).toMatch(/^guest-[0-9a-f]{16}@guest\.invalid$/);
    expect(saved.passwordHash).not.toMatch(/^\$2/); // not a bcrypt hash
    expect(createUserSession).toHaveBeenCalledWith("64b7f0c2a1b2c3d4e5f60bbb");
  });
  it("reuses the existing session instead of creating another account", async () => {
    const res = await guest(jsonReq("/api/auth/guest", "POST", {}), ctx());
    expect(res.status).toBe(200);
    expect(User.create).not.toHaveBeenCalled();
  });
  it("can be switched off by the owner", async () => {
    box.rules = mergeRules({ guestCheckout: false } as any);
    vi.mocked(getUserSession).mockResolvedValue(null);
    expect((await guest(jsonReq("/api/auth/guest", "POST", {}), ctx())).status).toBe(403);
  });
});

describe("POST /api/track", () => {
  const doc = { _id: ID, orderNumber: "OD-260101-ABC123", status: "shipped", createdAt: new Date(), customer: { phone: "9876543210" }, address: { phone: "9876543210", line1: "secret street" }, items: [{ product: "p", name: "Suit", size: "M", quantity: 1, price: 999 }], timeline: [], tracking: { carrier: "Delhivery", number: "AWB1" }, trackingEvents: [{ status: "In transit", at: new Date() }], payment: { method: "cod", status: "pending" }, total: 999, subtotal: 999, shipping: 0 };
  it("shows progress for the right order number + phone, without address or payment details", async () => {
    Order.findOne.mockReturnValue({ lean: async () => doc });
    const res = await track(jsonReq("/api/track", "POST", { orderNumber: "od-260101-abc123", phone: "+91 98765 43210" }), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order).toMatchObject({ orderNumber: "OD-260101-ABC123", status: "shipped", tracking: { number: "AWB1", url: "https://shiprocket.co/tracking/AWB1" } });
    expect(JSON.stringify(body)).not.toContain("secret street");
    expect(JSON.stringify(body)).not.toContain("payment");
  });
  it("refuses a wrong phone number with the same message as an unknown order", async () => {
    Order.findOne.mockReturnValue({ lean: async () => doc });
    expect((await track(jsonReq("/api/track", "POST", { orderNumber: "OD-260101-ABC123", phone: "9000000000" }), ctx())).status).toBe(404);
    Order.findOne.mockReturnValue({ lean: async () => null });
    expect((await track(jsonReq("/api/track", "POST", { orderNumber: "OD-260101-ZZZZZZ", phone: "9876543210" }), ctx())).status).toBe(404);
  });
});

describe("GET /api/pincode", () => {
  const get = (pin: string) => pincode(new Request(`http://localhost/api/pincode?pin=${pin}`, { headers: { "x-forwarded-for": `9.9.9.${pin.slice(-1)}` } }) as any, ctx());
  it("estimates delivery and tells whether COD works", async () => {
    box.rules = mergeRules({ cod: { blockedPincodes: ["7941"] } } as any);
    expect(await (await get("110001")).json()).toMatchObject({ deliverable: true, cod: true });
    expect(await (await get("794101")).json()).toMatchObject({ deliverable: true, cod: false });
  });
  it("says no for blocked pincodes and rejects bad input", async () => {
    box.rules = mergeRules({ blockedPincodes: ["110001"] } as any);
    expect(await (await get("110001")).json()).toMatchObject({ deliverable: false });
    expect((await get("12")).status).toBe(400);
  });
});

describe("POST /api/orders/:id/returns", () => {
  const delivered = (over: any = {}) => ({
    _id: ID, orderNumber: "OD-1", status: "delivered", deliveredAt: new Date(Date.now() - 2 * 86400000), customer: { name: "Ravi", email: "r@x.com", phone: "9876543210" },
    items: [{ product: "64b7f0c2a1b2c3d4e5f60001", slug: "suit", name: "Suit", size: "S", price: 1000, quantity: 2, art: { kind: "cloth", tone: "silver", hue: 1 } }],
    timeline: [], payment: { method: "razorpay", status: "paid" }, ...over,
  });
  const body = (over: any = {}) => ({ type: "return", items: [{ index: 0, quantity: 1 }], reason: "Size is too small", ...over });
  beforeEach(() => { Order.findOne.mockReturnValue({ lean: async () => delivered() }); Return.create.mockImplementation(async (d: any) => ({ _id: "64b7f0c2a1b2c3d4e5f60ccc", ...d, toObject() { return { _id: "64b7f0c2a1b2c3d4e5f60ccc", ...d, createdAt: new Date() }; } })); });

  it("creates a return request with a snapshot of the items", async () => {
    const res = await createReturn(jsonReq("/api/orders/x/returns", "POST", body()), ctx({ id: ID }));
    expect(res.status).toBe(201);
    expect(Return.create.mock.calls[0][0]).toMatchObject({ type: "return", status: "requested", user: user.id, items: [{ index: 0, name: "Suit", size: "S", quantity: 1, price: 1000 }] });
  });
  it("rejects a reason that is not in the owner's list", async () => {
    expect((await createReturn(jsonReq("/x", "POST", body({ reason: "Because" })), ctx({ id: ID }))).status).toBe(400);
  });
  it("rejects more units than were bought, and orders that are not delivered yet", async () => {
    expect((await createReturn(jsonReq("/x", "POST", body({ items: [{ index: 0, quantity: 3 }] })), ctx({ id: ID }))).status).toBe(400);
    Order.findOne.mockReturnValue({ lean: async () => delivered({ status: "shipped" }) });
    expect((await createReturn(jsonReq("/x", "POST", body()), ctx({ id: ID }))).status).toBe(400);
  });
  it("respects the per-product switch", async () => {
    Order.findOne.mockReturnValue({ lean: async () => delivered({ items: [{ ...delivered().items[0], returnable: false }] }) });
    expect((await createReturn(jsonReq("/x", "POST", body()), ctx({ id: ID }))).status).toBe(400);
  });
  it("exchange needs a different size that is in stock", async () => {
    const ex = (size?: string) => body({ type: "exchange", exchangeTo: size ? { size } : undefined });
    expect((await createReturn(jsonReq("/x", "POST", ex()), ctx({ id: ID }))).status).toBe(400); // no size chosen
    expect((await createReturn(jsonReq("/x", "POST", ex("S")), ctx({ id: ID }))).status).toBe(409); // S is sold out
    expect((await createReturn(jsonReq("/x", "POST", ex("XL")), ctx({ id: ID }))).status).toBe(409); // not offered
    const ok = await createReturn(jsonReq("/x", "POST", ex("M")), ctx({ id: ID }));
    expect(ok.status).toBe(201);
    expect(Return.create.mock.calls.at(-1)![0].exchangeTo).toEqual({ size: "M", color: undefined });
  });
  it("exchange handles one item at a time", async () => {
    expect((await createReturn(jsonReq("/x", "POST", body({ type: "exchange", items: [{ index: 0, quantity: 1 }, { index: 1, quantity: 1 }], exchangeTo: { size: "M" } })), ctx({ id: ID }))).status).toBe(400);
  });
  describe("where the refund goes", () => {
    it("wallet is the default choice and is stored with the request", async () => {
      await createReturn(jsonReq("/x", "POST", body({ refundTo: "wallet" })), ctx({ id: ID }));
      expect(Return.create.mock.calls.at(-1)![0]).toMatchObject({ refundTo: "wallet" });
    });
    it("a guest cannot ask for wallet credit, and neither can anyone when the wallet is off", async () => {
      vi.mocked(getUserSession).mockResolvedValue({ ...user, guest: true } as any);
      expect((await createReturn(jsonReq("/x", "POST", body({ refundTo: "wallet" })), ctx({ id: ID }))).status).toBe(400);
      vi.mocked(getUserSession).mockResolvedValue(user as any);
      box.rules = mergeRules({ wallet: { enabled: false } } as any);
      expect((await createReturn(jsonReq("/x", "POST", body({ refundTo: "wallet" })), ctx({ id: ID }))).status).toBe(400);
    });
    it("a COD order refunded to the bank needs UPI / bank details; a prepaid order does not", async () => {
      Order.findOne.mockReturnValue({ lean: async () => delivered({ payment: { method: "cod", status: "paid" } }) });
      expect((await createReturn(jsonReq("/x", "POST", body({ refundTo: "original" })), ctx({ id: ID }))).status).toBe(400);
      const ok = await createReturn(jsonReq("/x", "POST", body({ refundTo: "original", refundDetails: "ravi@upi" })), ctx({ id: ID }));
      expect(ok.status).toBe(201);
      expect(Return.create.mock.calls.at(-1)![0]).toMatchObject({ refundTo: "original", refundDetails: "ravi@upi" });
      Order.findOne.mockReturnValue({ lean: async () => delivered() }); // prepaid
      expect((await createReturn(jsonReq("/x", "POST", body({ refundTo: "original" })), ctx({ id: ID }))).status).toBe(201);
    });
  });
  it("cannot touch someone else's order", async () => {
    Order.findOne.mockReturnValue({ lean: async () => null });
    expect((await createReturn(jsonReq("/x", "POST", body()), ctx({ id: ID }))).status).toBe(404);
  });
});

describe("POST /api/push/subscribe", () => {
  it("stores the subscription (and ties it to the member, never to a guest)", async () => {
    const sub = { endpoint: "https://push.example/abc", keys: { p256dh: "k", auth: "a" } };
    expect((await pushSub(jsonReq("/api/push/subscribe", "POST", sub), ctx())).status).toBe(201);
    expect(Push.updateOne).toHaveBeenCalledWith({ endpoint: sub.endpoint }, expect.objectContaining({ $set: expect.objectContaining({ keys: sub.keys, user: user.id }) }), { upsert: true });
    vi.mocked(getUserSession).mockResolvedValue({ ...user, guest: true } as any);
    await pushSub(jsonReq("/api/push/subscribe", "POST", sub), ctx());
    expect(Push.updateOne.mock.calls[1][1].$set.user).toBeUndefined();
  });
  it("rejects garbage", async () => {
    expect((await pushSub(jsonReq("/api/push/subscribe", "POST", { endpoint: "nope" }), ctx())).status).toBe(400);
  });
});
