// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
const box = vi.hoisted(() => ({ rules: null as any }));
vi.mock("@/lib/settings", () => ({ getRules: async () => box.rules }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/user-auth", () => ({ getUserSession: vi.fn() }));
vi.mock("@/lib/repo-shop", () => ({ getCartLines: vi.fn() }));
vi.mock("@/models/Product", () => ({ ProductModel: { findById: vi.fn(), updateOne: vi.fn() } }));
vi.mock("@/models/Order", () => ({ OrderModel: { create: vi.fn(), updateOne: vi.fn(), find: vi.fn(), findById: vi.fn(), findOne: vi.fn() } }));
vi.mock("@/models/Cart", () => ({ CartModel: { updateOne: vi.fn() } }));
vi.mock("@/models/User", () => ({ UserModel: { updateOne: vi.fn(), findById: vi.fn() } }));
const wl = vi.hoisted(() => ({ credit: vi.fn(async () => 0), debit: vi.fn(async () => true) }));
vi.mock("@/lib/wallet", () => ({ creditWallet: wl.credit, debitWallet: wl.debit }));
const rp = vi.hoisted(() => ({ ordersCreate: vi.fn(), refund: vi.fn(), configured: true }));
vi.mock("@/lib/razorpay", async (orig) => ({
  ...(await orig<typeof import("@/lib/razorpay")>()),
  razorpayConfigured: () => rp.configured,
  razorpay: () => ({ orders: { create: rp.ordersCreate }, payments: { refund: rp.refund } }),
}));

import { getCartLines } from "@/lib/repo-shop";
import { ProductModel } from "@/models/Product";
import { OrderModel } from "@/models/Order";
import { CartModel } from "@/models/Cart";
import { UserModel } from "@/models/User";
import { cancelOrder, createOrderFromCart, markOrderPaid, releaseStock, reserveStock } from "@/lib/orders";
import { COD_MAX } from "@/lib/pricing";
import { mergeRules } from "@/lib/rules";

const Product = ProductModel as any, Order = OrderModel as any, Cart = CartModel as any, User = UserModel as any;
const user = { id: "64b7f0c2a1b2c3d4e5f60aaa", name: "Ravi Kumar", email: "ravi@x.com", phone: "9876543210" };
const address = { name: "Ravi Kumar", phone: "9876543210", line1: "12 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001" };

const line = (id: string, price: number, quantity: number, type: "laptop" | "accessory" = "laptop") => ({
  productId: id, quantity, addedAt: "", product: { id, slug: id, name: `Item ${id}`, brand: "Dell", price, type, art: { kind: "laptop", tone: "silver", hue: 200 }, images: undefined, available: 9 },
});

const orderDoc = (over: Record<string, any> = {}) => {
  const d: any = { _id: "64b7f0c2a1b2c3d4e5f60ooo", orderNumber: "LC-250101-ABC123", total: 32999, user: user.id, items: [{ product: "p1", quantity: 1, name: "Item p1" }], status: "confirmed", payment: { method: "razorpay", status: "paid", razorpayPaymentId: "pay_1" }, timeline: [] as any[], ...over };
  d.save = vi.fn();
  return d;
};

beforeEach(() => {
  wl.credit.mockClear(); wl.debit.mockClear(); wl.debit.mockResolvedValue(true);
  User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ walletBalance: 0 }) }) });
  box.rules = mergeRules(null);
  rp.configured = true;
  Product.findById.mockReturnValue({ select: () => ({ lean: async () => ({ quantity: 5 }) }) });
  Product.updateOne.mockResolvedValue({ modifiedCount: 1 });
  Order.create.mockImplementation(async (d: any) => ({ _id: "64b7f0c2a1b2c3d4e5f60ooo", ...d, payment: { ...d.payment }, timeline: [...d.timeline], save: vi.fn() }));
  Order.updateOne.mockResolvedValue({ modifiedCount: 1 });
  Order.find.mockReturnValue({ select: () => ({ lean: async () => [] }) });
  rp.ordersCreate.mockResolvedValue({ id: "order_RZP1" });
  rp.refund.mockResolvedValue({ id: "rfnd_1" });
});

describe("reserveStock / releaseStock", () => {
  it("takes the units out of stock with a guarded atomic update", async () => {
    await reserveStock([{ productId: "p1", quantity: 2, name: "A" }]);
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: "p1", quantity: { $gte: 2 } }, { $inc: { quantity: -2 } });
  });

  it("puts everything back and refuses the order if one item is short (nobody can oversell)", async () => {
    Product.updateOne.mockResolvedValueOnce({ modifiedCount: 1 }).mockResolvedValueOnce({ modifiedCount: 0 });
    await expect(reserveStock([{ productId: "p1", quantity: 1, name: "A" }, { productId: "p2", quantity: 1, name: "B" }])).rejects.toMatchObject({ status: 409, message: expect.stringContaining("B") });
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: "p1" }, { $inc: { quantity: 1 } }); // first item returned
  });

  it("releases stock only once per order, even if called twice", async () => {
    Order.updateOne.mockResolvedValueOnce({ modifiedCount: 1 }).mockResolvedValueOnce({ modifiedCount: 0 });
    Order.findById.mockReturnValue({ select: () => ({ lean: async () => ({ items: [{ product: "p1", quantity: 2 }] }) }) });
    await releaseStock("o1");
    await releaseStock("o1");
    const returns = Product.updateOne.mock.calls.filter((c: any[]) => c[1]?.$inc?.quantity === 2);
    expect(returns).toHaveLength(1);
  });
});

describe("createOrderFromCart", () => {
  it("Cash on Delivery: price comes from the database, stock is reserved, order is 'placed', cart is emptied", async () => {
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 32999, 1), line("p2", 599, 2, "accessory")] as any);
    const { order, razorpay } = await createOrderFromCart(user, address, "cod");

    expect(razorpay).toBeUndefined();
    const saved = Order.create.mock.calls[0][0];
    expect(saved).toMatchObject({ subtotal: 34197, shipping: 0, total: 34197, status: "placed", payment: { method: "cod", status: "pending" } });
    expect(saved.items).toHaveLength(2);
    expect(saved.items[0]).toMatchObject({ product: "p1", name: "Item p1", price: 32999, quantity: 1 });
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: "p2", quantity: { $gte: 2 } }, { $inc: { quantity: -2 } });
    expect(Cart.updateOne).toHaveBeenCalledWith({ user: user.id }, { $set: { items: [] } });
    expect(order.orderNumber).toMatch(/^OD-\d{6}-[0-9A-F]{6}$/);
  });

  it("COD with an advance: only the advance is collected online; the order waits for it", async () => {
    box.rules = mergeRules({ cod: { advance: 150 } } as any);
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 2)] as any);
    const { order, razorpay } = await createOrderFromCart(user, address, "cod");
    expect(rp.ordersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 15000 })); // ₹150 in paise, not the full total
    const saved = Order.create.mock.calls[0][0];
    expect(saved).toMatchObject({ status: "pending_payment", total: 3000, payment: { method: "cod", status: "pending", advance: { amount: 150, status: "pending" } } });
    expect(razorpay).toMatchObject({ orderId: "order_RZP1", amount: 15000 });
    expect(order.orderNumber).toBeTruthy();
  });

  it("COD advance is skipped when online payments are not configured", async () => {
    box.rules = mergeRules({ cod: { advance: 150 } } as any);
    rp.configured = false;
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 1)] as any);
    const { razorpay } = await createOrderFromCart(user, address, "cod");
    expect(razorpay).toBeUndefined();
    expect(Order.create.mock.calls[0][0].status).toBe("placed");
  });

  it("COD is refused for blocked pincodes (prefix match), and so is delivery to fully blocked pincodes", async () => {
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 1)] as any);
    box.rules = mergeRules({ cod: { blockedPincodes: ["4110"] } } as any);
    await expect(createOrderFromCart(user, address, "cod")).rejects.toMatchObject({ status: 400 });
    await expect(createOrderFromCart(user, address, "razorpay")).resolves.toBeTruthy(); // online is still fine
    box.rules = mergeRules({ blockedPincodes: ["411001"] } as any);
    await expect(createOrderFromCart(user, address, "razorpay")).rejects.toMatchObject({ status: 400 });
  });

  it("COD can be switched off completely", async () => {
    box.rules = mergeRules({ cod: { enabled: false } } as any);
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 1)] as any);
    await expect(createOrderFromCart(user, address, "cod")).rejects.toMatchObject({ status: 400 });
  });

  it("the advance of a cancelled COD order is refunded", async () => {
    const doc = orderDoc({ status: "placed", payment: { method: "cod", status: "pending", advance: { amount: 150, status: "paid", razorpayPaymentId: "pay_adv" } } });
    Order.findOne.mockResolvedValue(doc); Order.findById.mockResolvedValue(doc);
    await cancelOrder(String(doc._id), { by: "customer", userId: user.id } as any).catch(() => {});
    expect(rp.refund).toHaveBeenCalledWith("pay_adv", expect.objectContaining({ amount: 15000 }));
  });

  describe("store wallet at checkout", () => {
    const withBalance = (n: number) => User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ walletBalance: n }) }) });
    it("a partly-paying wallet reduces what Razorpay collects", async () => {
      withBalance(500);
      vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 2)] as any); // ₹3,000
      const { razorpay } = await createOrderFromCart(user, address, "razorpay", { useWallet: true });
      expect(wl.debit).toHaveBeenCalledWith(user.id, 500, expect.objectContaining({ type: "order" }));
      expect(rp.ordersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 250000 })); // ₹2,500 in paise
      expect(Order.create.mock.calls[0][0]).toMatchObject({ total: 3000, walletUsed: 500, status: "pending_payment", payment: { method: "razorpay" } });
      expect(razorpay).toMatchObject({ amount: 250000 });
    });
    it("a wallet that covers everything places the order straight away as paid", async () => {
      withBalance(5000);
      vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 1)] as any);
      const { razorpay } = await createOrderFromCart(user, address, "razorpay", { useWallet: true });
      expect(razorpay).toBeUndefined();
      expect(rp.ordersCreate).not.toHaveBeenCalled();
      expect(wl.debit).toHaveBeenCalledWith(user.id, 1500, expect.anything());
      expect(Order.create.mock.calls[0][0]).toMatchObject({ status: "placed", walletUsed: 1500, payment: { method: "wallet", status: "paid" } });
    });
    it("COD with wallet: the advance is worked out on what is left", async () => {
      box.rules = mergeRules({ cod: { advance: 100 } } as any);
      withBalance(1000);
      vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 2)] as any);
      await createOrderFromCart(user, address, "cod", { useWallet: true });
      expect(rp.ordersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 10000 }));
      expect(Order.create.mock.calls[0][0]).toMatchObject({ walletUsed: 1000, payment: { method: "cod", advance: { amount: 100 } } });
    });
    it("is not used unless the customer asks, and never for guests or when switched off", async () => {
      withBalance(900);
      vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 1)] as any);
      await createOrderFromCart(user, address, "cod");
      expect(wl.debit).not.toHaveBeenCalled();
      await createOrderFromCart({ ...user, guest: true } as any, address, "cod", { useWallet: true });
      expect(wl.debit).not.toHaveBeenCalled();
      box.rules = mergeRules({ wallet: { enabled: false } } as any);
      await createOrderFromCart(user, address, "cod", { useWallet: true });
      expect(wl.debit).not.toHaveBeenCalled();
    });
    it("if the balance changed meanwhile, the order is refused and the stock goes back", async () => {
      withBalance(500); wl.debit.mockResolvedValue(false);
      vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 1)] as any);
      await expect(createOrderFromCart(user, address, "razorpay", { useWallet: true })).rejects.toMatchObject({ status: 409 });
      expect(Order.create).not.toHaveBeenCalled();
      expect(Product.updateOne).toHaveBeenCalledWith({ _id: "p1" }, { $inc: { quantity: 1 } }); // reserved stock released
    });
    it("remembers when the customer was promised the order (delivery date)", async () => {
      vi.mocked(getCartLines).mockResolvedValue([line("p1", 1500, 1)] as any);
      await createOrderFromCart(user, address, "cod");
      const by = Order.create.mock.calls[0][0].expectedBy as Date;
      expect(by).toBeInstanceOf(Date);
      expect(by.getTime()).toBeGreaterThan(Date.now());
    });
    it("cancelling returns the wallet part to the wallet, and refunds only the online part to Razorpay", async () => {
      const doc = orderDoc({ status: "placed", total: 3000, walletUsed: 500, payment: { method: "razorpay", status: "paid", razorpayPaymentId: "pay_1" } });
      Order.findOne.mockResolvedValue(doc);
      Order.findById.mockReturnValue({ select: () => ({ lean: async () => ({ items: [{ product: "p1", quantity: 1 }] }) }) });
      Order.findOneAndUpdate = vi.fn(() => ({ select: () => ({ lean: async () => ({ user: user.id, walletUsed: 500, orderNumber: "OD-1" }) }) })) as any;
      await cancelOrder(String(doc._id), { by: "customer", userId: user.id } as any);
      expect(rp.refund).toHaveBeenCalledWith("pay_1", expect.objectContaining({ amount: 250000 }));
      expect(wl.credit).toHaveBeenCalledWith(user.id, 500, expect.objectContaining({ type: "order_cancelled" }));
    });
  });

  it("clothing: stock is taken from the exact size and the size is kept on the order", async () => {
    vi.mocked(getCartLines).mockResolvedValue([{ ...line("p1", 1500, 2), size: "M", color: "Maroon" }] as any);
    await createOrderFromCart(user, address, "cod");
    expect(Product.updateOne).toHaveBeenCalledWith(
      { _id: "p1", sizes: { $elemMatch: { label: "M", qty: { $gte: 2 } } } },
      { $inc: { "sizes.$.qty": -2, quantity: -2 } },
    );
    expect(Order.create.mock.calls[0][0].items[0]).toMatchObject({ size: "M", color: "Maroon", quantity: 2 });
  });

  it("clothing: a sold-out size stops the order and puts earlier items back", async () => {
    vi.mocked(getCartLines).mockResolvedValue([line("p2", 599, 1, "accessory"), { ...line("p1", 1500, 3), size: "S" }] as any);
    Product.updateOne.mockImplementation(async (filter: any) => ({ modifiedCount: filter.sizes ? 0 : 1 }));
    await expect(createOrderFromCart(user, address, "cod")).rejects.toMatchObject({ status: 409 });
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: "p2" }, { $inc: { quantity: 1 } });
  });

  it("remembers the delivery address for next time", async () => {
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 1000, 1)] as any);
    await createOrderFromCart(user, address, "cod");
    expect(User.updateOne).toHaveBeenCalledWith({ _id: user.id }, { $set: { lastAddress: address } });
  });

  it("Razorpay: creates a Razorpay order for the exact amount in paise and waits for payment", async () => {
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 32999, 1)] as any);
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_abc");
    const { order, razorpay } = await createOrderFromCart(user, address, "razorpay");

    expect(rp.ordersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 3299900, currency: "INR", receipt: order.orderNumber }));
    const saved = Order.create.mock.calls[0][0];
    expect(saved.status).toBe("pending_payment");
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now() + 25 * 60_000);
    expect(order.payment.razorpayOrderId).toBe("order_RZP1");
    expect(razorpay).toMatchObject({ orderId: "order_RZP1", amount: 3299900, currency: "INR" });
    expect(Cart.updateOne).not.toHaveBeenCalled(); // cart stays until the payment succeeds
    vi.unstubAllEnvs();
  });

  it("rejects an empty cart", async () => {
    vi.mocked(getCartLines).mockResolvedValue([]);
    await expect(createOrderFromCart(user, address, "cod")).rejects.toMatchObject({ status: 400 });
    expect(Order.create).not.toHaveBeenCalled();
  });

  it("rejects Cash on Delivery above the limit", async () => {
    vi.mocked(getCartLines).mockResolvedValue([line("p1", COD_MAX + 1, 1)] as any);
    await expect(createOrderFromCart(user, address, "cod")).rejects.toMatchObject({ status: 400, message: expect.stringContaining("Cash on Delivery") });
    expect(Product.updateOne).not.toHaveBeenCalled();
  });

  it("explains clearly when online payment is not set up (and reserves nothing)", async () => {
    rp.configured = false;
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 1000, 1)] as any);
    await expect(createOrderFromCart(user, address, "razorpay")).rejects.toMatchObject({ status: 503 });
    expect(Product.updateOne).not.toHaveBeenCalled();
  });

  it("if Razorpay is down: cancels the order and gives the stock back", async () => {
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 1000, 1)] as any);
    rp.ordersCreate.mockRejectedValue(new Error("network"));
    Order.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Order.findById.mockReturnValue({ select: () => ({ lean: async () => ({ items: [{ product: "p1", quantity: 1 }] }) }) });
    await expect(createOrderFromCart(user, address, "razorpay")).rejects.toMatchObject({ status: 502 });
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: "p1" }, { $inc: { quantity: 1 } });
  });

  it("does not create an order when an item sold out meanwhile", async () => {
    vi.mocked(getCartLines).mockResolvedValue([line("p1", 1000, 1)] as any);
    Product.updateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(createOrderFromCart(user, address, "cod")).rejects.toMatchObject({ status: 409 });
    expect(Order.create).not.toHaveBeenCalled();
  });
});

describe("markOrderPaid", () => {
  it("confirms the order, saves the payment id and removes the purchase from the customer's cart", async () => {
    Order.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Order.findById.mockReturnValue({ select: () => ({ lean: async () => ({ user: user.id }) }) });
    expect(await markOrderPaid("o1", "pay_1")).toBe(true);
    const [filter, update] = Order.updateOne.mock.calls[0];
    expect(filter).toMatchObject({ _id: "o1", status: "pending_payment" });
    expect(update.$set).toMatchObject({ status: "confirmed", "payment.status": "paid", "payment.razorpayPaymentId": "pay_1" });
    expect(Cart.updateOne).toHaveBeenCalledWith({ user: user.id }, { $set: { items: [] } });
  });

  it("is idempotent: the webhook arriving after the browser confirmation changes nothing", async () => {
    Order.updateOne.mockResolvedValue({ modifiedCount: 0 });
    Order.findOne.mockResolvedValue(null);
    expect(await markOrderPaid("o1", "pay_1")).toBe(false);
    expect(Cart.updateOne).not.toHaveBeenCalled();
  });

  it("a payment that arrives after the window re-reserves the stock when it is still there", async () => {
    Order.updateOne.mockResolvedValue({ modifiedCount: 0 });
    const late = orderDoc({ status: "cancelled", payment: { method: "razorpay", status: "failed" }, stockReleased: true });
    Order.findOne.mockResolvedValue(late);
    expect(await markOrderPaid("o1", "pay_LATE")).toBe(true);
    expect(late).toMatchObject({ status: "confirmed", stockReleased: false });
    expect(late.payment).toMatchObject({ status: "paid", razorpayPaymentId: "pay_LATE" });
    expect(late.save).toHaveBeenCalled();
  });

  it("…and refunds automatically when the item is gone", async () => {
    Order.updateOne.mockResolvedValue({ modifiedCount: 0 });
    const late = orderDoc({ status: "cancelled", payment: { method: "razorpay", status: "failed" }, total: 1000 });
    Order.findOne.mockResolvedValue(late);
    Product.updateOne.mockResolvedValue({ modifiedCount: 0 }); // sold out meanwhile
    expect(await markOrderPaid("o1", "pay_LATE")).toBe(false);
    expect(rp.refund).toHaveBeenCalledWith("pay_LATE", { amount: 100000 });
    expect(late.payment.status).toBe("refunded");
  });
});

describe("cancelOrder", () => {
  beforeEach(() => {
    Order.updateOne.mockResolvedValue({ modifiedCount: 1 });
    Order.findById.mockReturnValue({ select: () => ({ lean: async () => ({ items: [{ product: "p1", quantity: 1 }] }) }) });
  });

  it("refunds a paid online order in full, cancels it and restocks", async () => {
    const o = orderDoc({ total: 32999 });
    Order.findOne.mockResolvedValue(o);
    await cancelOrder("o1", { by: "customer", userId: user.id });
    expect(rp.refund).toHaveBeenCalledWith("pay_1", expect.objectContaining({ amount: 3299900 }));
    expect(o).toMatchObject({ status: "cancelled" });
    expect(o.payment).toMatchObject({ status: "refunded", refundId: "rfnd_1" });
    expect(o.save).toHaveBeenCalled();
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: "p1" }, { $inc: { quantity: 1 } });
  });

  it("does NOT cancel when the refund fails (so the customer is never left unrefunded)", async () => {
    const o = orderDoc();
    Order.findOne.mockResolvedValue(o);
    rp.refund.mockRejectedValue({ error: { description: "Insufficient balance" } });
    await expect(cancelOrder("o1", { by: "admin" })).rejects.toMatchObject({ status: 502, message: expect.stringContaining("Insufficient balance") });
    expect(o.status).toBe("confirmed");
    expect(o.save).not.toHaveBeenCalled();
  });

  it("cancels a Cash on Delivery order without any refund", async () => {
    const o = orderDoc({ status: "placed", payment: { method: "cod", status: "pending" } });
    Order.findOne.mockResolvedValue(o);
    await cancelOrder("o1", { by: "customer", userId: user.id });
    expect(rp.refund).not.toHaveBeenCalled();
    expect(o.status).toBe("cancelled");
  });

  it("customers cannot cancel after shipping; the admin can", async () => {
    Order.findOne.mockResolvedValue(orderDoc({ status: "shipped" }));
    await expect(cancelOrder("o1", { by: "customer", userId: user.id })).rejects.toMatchObject({ status: 400, message: expect.stringContaining("shipped") });
    Order.findOne.mockResolvedValue(orderDoc({ status: "shipped" }));
    await expect(cancelOrder("o1", { by: "admin" })).resolves.toBeDefined();
  });

  it("refuses delivered and already-cancelled orders", async () => {
    Order.findOne.mockResolvedValue(orderDoc({ status: "delivered" }));
    await expect(cancelOrder("o1", { by: "admin" })).rejects.toMatchObject({ status: 400 });
    Order.findOne.mockResolvedValue(orderDoc({ status: "cancelled" }));
    await expect(cancelOrder("o1", { by: "admin" })).rejects.toMatchObject({ status: 400 });
  });

  it("a customer can only cancel their own order (lookup is scoped to the user)", async () => {
    Order.findOne.mockResolvedValue(null);
    await expect(cancelOrder("o1", { by: "customer", userId: "someone-else" })).rejects.toMatchObject({ status: 404 });
    expect(Order.findOne).toHaveBeenCalledWith({ _id: "o1", user: "someone-else" });
  });
});
