import { connectDB } from "./db";
import { ProductModel } from "@/models/Product";
import { BannerModel } from "@/models/Banner";
import { EnquiryModel } from "@/models/Enquiry";
import { AdminModel } from "@/models/Admin";
import { AnnouncementModel } from "@/models/Announcement";
import { searchProducts } from "./search";
import { getShopStats } from "./repo-shop";
import type { Announcement, ArtKind, Banner, Enquiry, Product, ProductType, Tone } from "./types";

/* All database reads used by pages. Returns plain, serialisable objects. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;
const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : new Date().toISOString());

/** Units on hand. Older records (before carts existed) only had a stock label, so fall back to it. */
export function unitsOf(d: Doc): number {
  if (Array.isArray(d.sizes) && d.sizes.length) return d.sizes.reduce((n: number, s: Doc) => n + Math.max(0, s.qty ?? 0), 0);
  if (typeof d.quantity === "number") return d.quantity;
  if (d.stock === "out") return 0;
  return d.stockCount ?? 5;
}

export function toProduct(d: Doc): Product {
  const quantity = unitsOf(d);
  // a flash sale only applies while it is running; the moment it ends the normal price is back (checked on every read, also at checkout)
  const flashOn = d.flashPrice > 0 && d.flashEndsAt && new Date(d.flashEndsAt).getTime() > Date.now() && d.flashPrice < d.price;
  return {
    id: String(d._id),
    slug: d.slug,
    type: d.type,
    name: d.name,
    brand: d.brand,
    price: flashOn ? d.flashPrice : d.price,
    mrp: flashOn ? (d.mrp && d.mrp > d.price ? d.mrp : d.price) : d.mrp ?? undefined,
    flash: flashOn ? { price: d.flashPrice, endsAt: new Date(d.flashEndsAt).toISOString() } : undefined,
    base: flashOn ? { price: d.price, mrp: d.mrp ?? undefined } : undefined,
    flashRaw: d.flashPrice > 0 && d.flashEndsAt ? { price: d.flashPrice, endsAt: new Date(d.flashEndsAt).toISOString() } : undefined,
    condition: d.condition,
    stock: quantity <= 0 ? "out" : quantity <= 3 ? "low" : "in-stock",
    stockCount: quantity > 0 && quantity <= 3 ? quantity : undefined,
    quantity,
    category: d.category,
    tags: d.tags ?? [],
    specs: d.specs ?? {},
    highlights: d.highlights ?? [],
    ramGb: d.ramGb ?? undefined,
    cpu: d.cpu ?? undefined,
    screenIn: d.screenIn ?? undefined,
    included: d.included ?? [],
    conditionNotes: d.conditionNotes ?? [],
    description: d.description ?? "",
    warranty: d.warranty ?? "",
    featured: !!d.featured,
    views: d.views ?? 0,
    createdAt: iso(d.createdAt),
    art: d.art ?? { kind: d.type === "laptop" ? "laptop" : d.type === "clothing" ? "cloth" : "hub", tone: "silver", hue: d.type === "clothing" ? 340 : 215 },
    images: d.images?.length ? d.images : undefined,
    sizes: Array.isArray(d.sizes) && d.sizes.length ? d.sizes.map((s: Doc) => ({ label: s.label, qty: s.qty ?? 0 })) : undefined,
    colors: Array.isArray(d.colors) && d.colors.length ? d.colors.map((c: Doc) => ({ name: c.name, hex: c.hex || undefined, images: c.images?.length ? c.images : undefined })) : undefined,
    videoUrl: d.videoUrl || undefined,
    returnable: d.returnable !== false,
    exchangeable: d.exchangeable !== false,
    fabric: d.fabric || undefined,
    washCare: d.washCare || undefined,
    fit: d.fit || undefined,
    occasion: d.occasion || undefined,
    badges: d.badges ?? [],
  };
}

const toBanner = (d: Doc): Banner => ({
  id: String(d._id), title: d.title, subtitle: d.subtitle ?? "", cta: d.cta ?? "Shop now",
  href: d.href ?? "/shop", theme: d.theme ?? "blue", active: !!d.active, image: d.image ?? undefined,
});

const toEnquiry = (d: Doc): Enquiry => ({
  id: String(d._id), name: d.name, phone: d.phone, source: d.source, message: d.message ?? "",
  products: d.products ?? [], status: d.status, createdAt: iso(d.createdAt),
  sell: d.sell ? { brand: d.sell.brand, model: d.sell.model, condition: d.sell.condition, expectedPrice: d.sell.expectedPrice, city: d.sell.city, photos: d.sell.photos ?? [] } : undefined,
});

export async function getProducts(type?: ProductType): Promise<Product[]> {
  await connectDB();
  const docs = await ProductModel.find(type ? { type } : {}).sort({ createdAt: -1 }).lean();
  return docs.map(toProduct);
}

let cache: { at: number; items: Product[] } | null = null;
const CACHE_MS = 15_000;

/** All products, kept in memory for a few seconds so live search does not hit the database on every keystroke. */
export async function getAllProductsCached(): Promise<Product[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;
  const items = await getProducts();
  cache = { at: Date.now(), items };
  return items;
}
export const invalidateProductCache = () => { cache = null; };

export async function searchCatalog(q: string, limit = 24): Promise<Product[]> {
  return searchProducts(await getAllProductsCached(), q, limit);
}

export async function getFeatured(type: ProductType, limit = 4): Promise<Product[]> {
  await connectDB();
  const featured = await ProductModel.find({ type, featured: true, quantity: { $ne: 0 } }).sort({ views: -1 }).limit(limit).lean();
  let list = featured.map(toProduct);
  if (list.length < limit) {
    // top up with the newest items so the home page never looks empty
    const ids = list.map((p) => p.id);
    const more = await ProductModel.find({ type, _id: { $nin: ids } }).sort({ createdAt: -1 }).limit(limit - list.length).lean();
    list = [...list, ...more.map(toProduct)];
  }
  return list;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await connectDB();
  const d = await ProductModel.findOne({ slug }).lean();
  return d ? toProduct(d) : null;
}

export async function getSimilar(p: Product, limit = 4): Promise<Product[]> {
  await connectDB();
  const docs = await ProductModel.find({ type: p.type, _id: { $ne: p.id } }).lean();
  return docs
    .map(toProduct)
    .map((x) => ({
      x,
      score: (x.category === p.category ? 3 : 0) + (x.brand === p.brand ? 2 : 0) + (1 - Math.min(Math.abs(x.price - p.price) / Math.max(p.price, 1), 1)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.x);
}

export async function getBanners(onlyActive = false): Promise<Banner[]> {
  await connectDB();
  const docs = await BannerModel.find(onlyActive ? { active: true } : {}).sort({ createdAt: -1 }).lean();
  return docs.map(toBanner);
}

export const toAnnouncement = (d: Doc): Announcement => ({ id: String(d._id), text: d.text, href: d.href || undefined, active: !!d.active });

export async function getAnnouncements(onlyActive = false): Promise<Announcement[]> {
  await connectDB();
  const docs = await AnnouncementModel.find(onlyActive ? { active: true } : {}).sort({ createdAt: -1 }).lean();
  return docs.map(toAnnouncement);
}

export async function getEnquiries(): Promise<Enquiry[]> {
  await connectDB();
  const docs = await EnquiryModel.find({}).sort({ createdAt: -1 }).limit(500).lean();
  return docs.map(toEnquiry);
}

export async function getAdmins() {
  await connectDB();
  const docs = await AdminModel.find({}).sort({ createdAt: 1 }).lean();
  return docs.map((d) => ({ id: String(d._id), name: d.name as string, email: d.email as string }));
}

export async function getDashboard() {
  await connectDB();
  const monthAgo = new Date(Date.now() - 30 * 86400000);
  const sevenWeeksAgo = new Date(Date.now() - 49 * 86400000);
  const [laptops, accessories, top, thisMonth, fresh, recent, recentDates] = await Promise.all([
    ProductModel.countDocuments({ type: { $in: ["clothing", "laptop"] } }),
    ProductModel.countDocuments({ type: "accessory" }),
    ProductModel.find({}).sort({ views: -1 }).limit(4).lean(),
    EnquiryModel.countDocuments({ createdAt: { $gte: monthAgo } }),
    EnquiryModel.countDocuments({ status: "new" }),
    EnquiryModel.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    EnquiryModel.find({ createdAt: { $gte: sevenWeeksAgo } }).select("createdAt").lean(),
  ]);
  const weekly = Array.from({ length: 7 }, () => 0);
  for (const e of recentDates) {
    const weeksAgo = Math.floor((Date.now() - +new Date(e.createdAt as Date)) / (7 * 86400000));
    if (weeksAgo >= 0 && weeksAgo < 7) weekly[6 - weeksAgo]++;
  }
  const shop = await getShopStats();
  return {
    shop,
    laptops, accessories, thisMonth, fresh, weekly,
    top: top.map(toProduct),
    recent: recent.map(toEnquiry),
  };
}

/* ---- placeholder-art helpers used when a product is created from the dashboard ---- */
const CATEGORY_ART: Record<string, ArtKind> = {
  chargers: "charger", charger: "charger", mouse: "mouse", bags: "bag", bag: "bag", keyboards: "keyboard", keyboard: "keyboard",
  headphones: "headphones", storage: "ssd", docks: "dock", stands: "stand", upgrades: "ram", ram: "ram", cooling: "cooler",
};
export function artFor(input: { type: ProductType; brand: string; category: string; tags: string[]; name: string }): { kind: ArtKind; tone: Tone; hue: number } {
  let h = 0;
  for (const c of input.name) h = (h * 31 + c.charCodeAt(0)) % 360;
  const hue = 180 + (h % 90);
  if (input.type === "clothing") return { kind: "cloth", tone: "silver", hue: [340, 300, 20, 160, 260, 40][hue % 6] };
  if (input.type === "laptop") {
    const kind: ArtKind = input.tags.includes("gaming") || input.category.toLowerCase() === "gaming" ? "gaming" : input.brand.toLowerCase() === "apple" ? "macbook" : "laptop";
    return { kind, tone: kind === "gaming" ? "black" : "silver", hue: kind === "gaming" ? 350 : hue };
  }
  return { kind: CATEGORY_ART[input.category.toLowerCase()] ?? "hub", tone: "silver", hue };
}

/** Collections = product categories of the clothing range, with a count and a cover photo for the home page cards. */
export async function getCollections(): Promise<{ name: string; slug: string; count: number; image?: string }[]> {
  await connectDB();
  const docs = (await ProductModel.find({ type: "clothing" }).select("category images createdAt").sort({ createdAt: -1 }).lean()) as Doc[];
  const map = new Map<string, { name: string; slug: string; count: number; image?: string }>();
  for (const d of docs) {
    const name = String(d.category ?? "").trim();
    if (!name) continue;
    const slug = collectionSlug(name);
    const cur = map.get(slug) ?? { name, slug, count: 0, image: undefined };
    cur.count++;
    if (!cur.image && d.images?.length) cur.image = d.images[0];
    map.set(slug, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export const collectionSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export async function getNewest(type: ProductType, limit = 8): Promise<Product[]> {
  await connectDB();
  return (await ProductModel.find({ type }).sort({ createdAt: -1 }).limit(limit).lean()).map(toProduct);
}

/** Products with a flash sale running right now, soonest-ending first. */
export async function getFlashProducts(limit = 8): Promise<Product[]> {
  await connectDB();
  const docs = await ProductModel.find({ type: "clothing", flashPrice: { $gt: 0 }, flashEndsAt: { $gt: new Date() }, quantity: { $ne: 0 } }).sort({ flashEndsAt: 1 }).limit(limit * 2).lean();
  return docs.map(toProduct).filter((p) => p.flash).slice(0, limit);
}

/** What the "shop by" pages are built from: occasions and colours that real products have. */
export async function getFacets(): Promise<{ occasions: { name: string; slug: string; count: number }[]; colors: { name: string; slug: string; hex?: string; count: number }[] }> {
  await connectDB();
  const docs = (await ProductModel.find({ type: "clothing" }).select("occasion colors").lean()) as Doc[];
  const occ = new Map<string, { name: string; slug: string; count: number }>();
  const col = new Map<string, { name: string; slug: string; hex?: string; count: number }>();
  for (const d of docs) {
    const o = String(d.occasion ?? "").trim();
    if (o) { const slug = collectionSlug(o); const c = occ.get(slug) ?? { name: o, slug, count: 0 }; c.count++; occ.set(slug, c); }
    for (const c of (d.colors ?? []) as Doc[]) {
      const name = String(c.name ?? "").trim(); if (!name) continue;
      const slug = collectionSlug(name); const e = col.get(slug) ?? { name, slug, hex: c.hex || undefined, count: 0 }; e.count++; if (!e.hex && c.hex) e.hex = c.hex; col.set(slug, e);
    }
  }
  const sort = <T extends { count: number }>(m: Map<string, T>) => [...m.values()].sort((a, b) => b.count - a.count);
  return { occasions: sort(occ), colors: sort(col) };
}
