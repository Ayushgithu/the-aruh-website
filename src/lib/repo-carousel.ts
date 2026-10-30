import { connectDB } from "./db";
import { SlideModel } from "@/models/Slide";
import { BrandModel } from "@/models/Brand";
import { ProductModel } from "@/models/Product";
import type { BrandItem, Slide } from "./carousel-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = Record<string, any>;

const toSlide = (d: Doc): Slide => ({
  id: String(d._id), title: d.title, href: d.href ?? "", image: d.image,
  mobileImage: d.mobileImage || undefined, active: !!d.active, order: d.order ?? 0,
});
const toBrand = (d: Doc): BrandItem => ({
  id: String(d._id), name: d.name, logo: d.logo || undefined, href: d.href ?? "", active: !!d.active, order: d.order ?? 0,
});

export async function getSlides(onlyActive = false): Promise<Slide[]> {
  await connectDB();
  const docs = await SlideModel.find(onlyActive ? { active: true } : {}).sort({ order: 1, createdAt: -1 }).lean();
  return (docs as Doc[]).map(toSlide);
}

/**
 * Brands for the home page. Until the owner adds any in the dashboard, the strip falls back to the brands
 * found on the laptop listings so the section is never empty.
 */
export async function getBrands(onlyActive = false): Promise<BrandItem[]> {
  await connectDB();
  const docs = (await BrandModel.find({}).sort({ order: 1, createdAt: -1 }).lean()) as Doc[];
  if (docs.length === 0 && onlyActive) {
    const names = ((await ProductModel.distinct("brand", { type: { $in: ["clothing", "laptop"] } })) as string[]).filter(Boolean).sort();
    return names.map((name, i) => ({ id: `auto-${i}`, name, href: "", active: true, order: i }));
  }
  return docs.map(toBrand).filter((b) => !onlyActive || b.active);
}

export async function nextOrder(model: typeof SlideModel | typeof BrandModel): Promise<number> {
  const last = (await model.findOne({}).sort({ order: -1 }).select("order").lean()) as Doc | null;
  return (last?.order ?? -1) + 1;
}
