import mongoose from "mongoose";
import { connectDB } from "./db";
import { CartModel } from "@/models/Cart";
import { OrderModel } from "@/models/Order";
import { UserModel } from "@/models/User";
import { ProductModel } from "@/models/Product";
import { toProduct, unitsOf } from "./repo";
import type { SavedAddress, AdminCart, CardProduct, CartLine, Customer, Order, Product } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;
const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : new Date().toISOString());
const id = (v: unknown) => String((v as Doc)?._id ?? v);

export const toCardProduct = (d: Doc): CardProduct => {
  const p: Product = toProduct(d);
  return { id: p.id, slug: p.slug, name: p.name, brand: p.brand, price: p.price, mrp: p.mrp, condition: p.condition, stock: p.stock, type: p.type, art: p.art, images: p.images?.slice(0, 2), sizes: p.sizes, colors: p.colors, available: unitsOf(d) };
};

export function toOrder(d: Doc): Order {
  return {
    id: id(d), orderNumber: d.orderNumber, userId: id(d.user),
    customer: { name: d.customer?.name ?? "", email: d.customer?.email ?? "", phone: d.customer?.phone ?? "" },
    items: (d.items ?? []).map((i: Doc) => ({ productId: id(i.product), size: i.size || undefined, color: i.color || undefined, slug: i.slug, name: i.name, brand: i.brand, price: i.price, quantity: i.quantity, image: i.image || undefined, art: i.art, returnable: i.returnable !== false, exchangeable: i.exchangeable !== false })),
    subtotal: d.subtotal, shipping: d.shipping, total: d.total,
    address: { name: d.address?.name ?? "", phone: d.address?.phone ?? "", line1: d.address?.line1 ?? "", line2: d.address?.line2 || undefined, city: d.address?.city ?? "", state: d.address?.state ?? "", pincode: d.address?.pincode ?? "" },
    payment: {
      method: d.payment?.method, status: d.payment?.status ?? "pending",
      razorpayOrderId: d.payment?.razorpayOrderId || undefined, razorpayPaymentId: d.payment?.razorpayPaymentId || undefined,
      paidAt: d.payment?.paidAt ? iso(d.payment.paidAt) : undefined, refundId: d.payment?.refundId || undefined,
      advance: d.payment?.advance?.amount ? { amount: d.payment.advance.amount, status: d.payment.advance.status ?? "pending", paidAt: d.payment.advance.paidAt ? iso(d.payment.advance.paidAt) : undefined } : undefined,
    },
    status: d.status,
    tracking: d.tracking?.number ? { carrier: d.tracking.carrier ?? "", number: d.tracking.number, url: d.tracking.url || undefined, labelUrl: d.tracking.labelUrl || undefined, shiprocketOrderId: d.tracking.shiprocketOrderId || undefined } : undefined,
    trackingEvents: (d.trackingEvents ?? []).map((t: Doc) => ({ status: t.status, at: iso(t.at), location: t.location || undefined, note: t.note || undefined })),
    deliveredAt: d.deliveredAt ? iso(d.deliveredAt) : undefined,
    walletUsed: d.walletUsed || undefined,
    expectedBy: d.expectedBy ? iso(d.expectedBy) : undefined,
    timeline: (d.timeline ?? []).map((t: Doc) => ({ status: t.status, at: iso(t.at), note: t.note || undefined })),
    createdAt: iso(d.createdAt),
    expiresAt: d.expiresAt ? iso(d.expiresAt) : undefined,
  };
}

/** A customer's cart with live product data (price, stock). Lines whose product was deleted are dropped. */
export async function getCartLines(userId: string): Promise<CartLine[]> {
  await connectDB();
  const cart = await CartModel.findOne({ user: userId }).populate("items.product").lean();
  if (!cart) return [];
  return ((cart.items ?? []) as Doc[])
    .filter((i) => i.product && i.product._id)
    .map((i) => {
      const product = toCardProduct(i.product);
      const sz = i.size ? product.sizes?.find((s) => s.label === i.size) : undefined;
      return { productId: id(i.product), size: i.size || undefined, color: i.color || undefined, quantity: i.quantity, addedAt: iso(i.addedAt), product: sz ? { ...product, available: sz.qty } : product };
    });
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  await connectDB();
  return (await OrderModel.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean()).map(toOrder);
}

export async function getUserOrder(orderId: string, userId: string): Promise<Order | null> {
  if (!mongoose.isValidObjectId(orderId)) return null;
  await connectDB();
  const d = await OrderModel.findOne({ _id: orderId, user: userId }).lean();
  return d ? toOrder(d) : null;
}

export async function getAdminOrders(): Promise<Order[]> {
  await connectDB();
  return (await OrderModel.find({}).sort({ createdAt: -1 }).limit(500).lean()).map(toOrder);
}

/** Every customer's non-empty cart — what the admin sees under "Carts". Disappears as customers remove items or buy. */
export async function getAdminCarts(): Promise<AdminCart[]> {
  await connectDB();
  const carts = await CartModel.find({ "items.0": { $exists: true } }).populate("user", "name email phone").populate("items.product").sort({ updatedAt: -1 }).lean();
  return (carts as Doc[])
    .filter((c) => c.user)
    .map((c) => {
      const items = ((c.items ?? []) as Doc[])
        .filter((i) => i.product && i.product._id)
        .map((i) => {
          const p = toCardProduct(i.product);
          return { productId: p.id, size: i.size || undefined, color: i.color || undefined, slug: p.slug, name: p.name, brand: p.brand, price: p.price, quantity: i.quantity as number, addedAt: iso(i.addedAt), image: p.images?.[0], art: p.art, available: p.available };
        });
      return { userId: id(c.user), customer: { name: c.user.name, email: c.user.email, phone: c.user.phone }, items, total: items.reduce((s, i) => s + i.price * i.quantity, 0), updatedAt: iso(c.updatedAt) };
    })
    .filter((c) => c.items.length > 0);
}

export async function getCustomers(): Promise<Customer[]> {
  await connectDB();
  const [users, orders, carts] = await Promise.all([
    UserModel.find({}).sort({ createdAt: -1 }).limit(1000).lean(),
    OrderModel.aggregate([{ $match: { status: { $nin: ["cancelled", "pending_payment"] } } }, { $group: { _id: "$user", orders: { $sum: 1 }, spent: { $sum: "$total" } } }]),
    CartModel.find({ "items.0": { $exists: true } }).select("user").lean(),
  ]);
  const stats = new Map<string, { orders: number; spent: number }>((orders as Doc[]).map((o) => [String(o._id), { orders: o.orders, spent: o.spent }]));
  const withCart = new Set((carts as Doc[]).map((c) => String(c.user)));
  return (users as Doc[]).map((u) => ({
    id: id(u), name: u.name, email: u.email, phone: u.phone, createdAt: iso(u.createdAt),
    orders: stats.get(id(u))?.orders ?? 0, spent: stats.get(id(u))?.spent ?? 0, carts: withCart.has(id(u)) ? 1 : 0,
  }));
}

export async function getShopStats() {
  await connectDB();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const sold = { status: { $nin: ["cancelled", "pending_payment"] } };
  const [revenueAgg, ordersThisMonth, toProcess, cartAgg, customers, lowStock] = await Promise.all([
    OrderModel.aggregate([{ $match: { ...sold, createdAt: { $gte: monthStart } } }, { $group: { _id: null, revenue: { $sum: "$total" } } }]),
    OrderModel.countDocuments({ ...sold, createdAt: { $gte: monthStart } }),
    OrderModel.countDocuments({ status: { $in: ["placed", "confirmed"] } }),
    CartModel.aggregate([{ $match: { "items.0": { $exists: true } } }, { $count: "n" }]),
    UserModel.countDocuments(),
    ProductModel.countDocuments({ quantity: { $gt: 0, $lte: 3 } }),
  ]);
  return {
    revenue: (revenueAgg[0]?.revenue as number) ?? 0,
    ordersThisMonth,
    toProcess,
    activeCarts: (cartAgg[0]?.n as number) ?? 0,
    customers,
    lowStock,
  };
}

export async function getWishlistProducts(userId: string): Promise<Product[]> {
  await connectDB();
  const u = await UserModel.findById(userId).select("wishlist").lean();
  const ids = ((u as Doc | null)?.wishlist ?? []) as unknown[];
  if (!ids.length) return [];
  const docs = await ProductModel.find({ _id: { $in: ids } }).lean();
  return docs.map(toProduct);
}

export async function getSavedAddress(userId: string) {
  await connectDB();
  const u = await UserModel.findById(userId).select("lastAddress").lean();
  const a = (u as Doc | null)?.lastAddress;
  return a?.line1 ? { name: a.name ?? "", phone: a.phone ?? "", line1: a.line1, line2: a.line2 ?? "", city: a.city ?? "", state: a.state ?? "", pincode: a.pincode ?? "" } : null;
}

/** The customer's saved addresses (Home, Work …). The default one comes first. */
export async function getAddresses(userId: string): Promise<SavedAddress[]> {
  await connectDB();
  const u: Doc | null = await UserModel.findById(userId).select("addresses").lean();
  const list: SavedAddress[] = ((u?.addresses ?? []) as Doc[]).map((a) => ({
    id: String(a._id), label: a.label || "Home", isDefault: !!a.isDefault,
    name: a.name ?? "", phone: a.phone ?? "", line1: a.line1 ?? "", line2: a.line2 || undefined, city: a.city ?? "", state: a.state ?? "", pincode: a.pincode ?? "",
  }));
  return list.sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault));
}

/** A shared wishlist, found by its public link token. Only the first name and the products are exposed. */
export async function getSharedWishlist(token: string): Promise<{ owner: string; items: Product[] } | null> {
  if (!/^[a-f0-9]{24}$/.test(token)) return null;
  await connectDB();
  const u: Doc | null = await UserModel.findOne({ shareToken: token }).select("name wishlist guest").lean();
  if (!u) return null;
  const items = await getWishlistProducts(String(u._id));
  return { owner: String(u.name ?? "").split(" ")[0] || "Someone", items };
}
