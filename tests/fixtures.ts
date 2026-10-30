import type { Banner, Enquiry, Product } from "@/lib/types";

export const makeProduct = (over: Partial<Product> = {}): Product => ({
  id: "64b7f0c2a1b2c3d4e5f60001",
  slug: "dell-latitude-5420",
  type: "laptop",
  name: "Dell Latitude 5420",
  brand: "Dell",
  price: 32999,
  mrp: 74000,
  condition: "A",
  stock: "in-stock",
  category: "Business",
  tags: ["business"],
  specs: { Processor: "Intel Core i5", RAM: "16 GB" },
  highlights: ["Core i5", "16 GB RAM", "14\" Full HD"],
  ramGb: 16,
  cpu: "Intel Core i5",
  screenIn: 14,
  included: ["Original charger"],
  conditionNotes: ["Light scratches on the lid"],
  description: "A dependable daily driver.",
  warranty: "1-year Laptop Clinic warranty",
  featured: true,
  views: 120,
  createdAt: "2026-09-20T10:00:00.000Z",
  art: { kind: "laptop", tone: "graphite", hue: 215 },
  ...over,
});

export const makeBanner = (over: Partial<Banner> = {}): Banner => ({
  id: "64b7f0c2a1b2c3d4e5f60101",
  title: "Festive laptop sale",
  subtitle: "Up to 60% off retail on Grade A laptops.",
  cta: "Shop the sale",
  href: "/laptops",
  theme: "blue",
  active: true,
  ...over,
});

export const makeEnquiry = (over: Partial<Enquiry> = {}): Enquiry => ({
  id: "64b7f0c2a1b2c3d4e5f60201",
  name: "Aarav Mehta",
  phone: "+91 98111 20001",
  source: "Product enquiry",
  message: "Is the MacBook Air still available?",
  products: ["Apple MacBook Air M1"],
  status: "new",
  createdAt: "2026-09-29T09:00:00.000Z",
  ...over,
});

import type { CartLine, CustomerUser, Order } from "@/lib/types";

export const customer: CustomerUser = { id: "64b7f0c2a1b2c3d4e5f60aaa", name: "Ravi Kumar", email: "ravi@x.com", phone: "9876543210" };

export const makeLine = (over: { id?: string; name?: string; price?: number; quantity?: number; available?: number; type?: "laptop" | "accessory" } = {}): CartLine => {
  const id = over.id ?? "64b7f0c2a1b2c3d4e5f60001";
  return {
    productId: id, quantity: over.quantity ?? 1, addedAt: "2026-10-01T10:00:00.000Z",
    product: { id, slug: "dell-latitude-5420", name: over.name ?? "Dell Latitude 5420", brand: "Dell", price: over.price ?? 32999, mrp: 74000, condition: "A", stock: "in-stock", type: over.type ?? "laptop", art: { kind: "laptop", tone: "graphite", hue: 215 }, available: over.available ?? 5 },
  };
};

export const makeOrder = (over: Partial<Order> = {}): Order => ({
  id: "64b7f0c2a1b2c3d4e5f60ooo".replace(/o/g, "e"), orderNumber: "LC-251001-ABC123", userId: customer.id,
  customer: { name: "Ravi Kumar", email: "ravi@x.com", phone: "9876543210" },
  items: [{ productId: "64b7f0c2a1b2c3d4e5f60001", slug: "dell-latitude-5420", name: "Dell Latitude 5420", brand: "Dell", price: 32999, quantity: 1, art: { kind: "laptop", tone: "graphite", hue: 215 } }],
  subtotal: 32999, shipping: 0, total: 32999,
  address: { name: "Ravi Kumar", phone: "9876543210", line1: "12 MG Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
  payment: { method: "razorpay", status: "paid", razorpayPaymentId: "pay_1" },
  status: "confirmed", timeline: [{ status: "confirmed", at: "2026-10-01T10:00:00.000Z" }], createdAt: "2026-10-01T10:00:00.000Z", ...over,
});
