import { connectDB } from "@/lib/db";
import { OrderModel } from "@/models/Order";
import { trackLookupSchema } from "@/lib/validation";
import { fail, ok, publicRoute, readJson } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { toOrder } from "@/lib/repo-shop";
import { trackingUrl } from "@/lib/tracking";

const last10 = (s: string) => s.replace(/\D/g, "").slice(-10);

/** Look up an order with its number + the phone it was placed with. Shows progress only (no address or payment details). */
export const POST = publicRoute(async (req) => {
  if (!rateLimit(`track:${clientIp(req)}`, 20, 10 * 60_000)) return fail("Too many lookups. Please wait a few minutes.", 429);
  const v = trackLookupSchema.parse(await readJson(req));
  await connectDB();
  const d = await OrderModel.findOne({ orderNumber: v.orderNumber.toUpperCase() }).lean();
  const phones = d ? [(d as any).customer?.phone, (d as any).address?.phone].filter(Boolean).map(last10) : []; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!d || !phones.includes(last10(v.phone))) return fail("We could not find an order with that number and phone. Please check both.", 404);
  const o = toOrder(d);
  return ok({
    order: {
      orderNumber: o.orderNumber, status: o.status, createdAt: o.createdAt,
      items: o.items.map((i) => ({ name: i.name, size: i.size, color: i.color, quantity: i.quantity })),
      timeline: o.timeline, tracking: o.tracking ? { carrier: o.tracking.carrier, number: o.tracking.number, url: trackingUrl(o.tracking) } : undefined,
      trackingEvents: o.trackingEvents ?? [],
    },
  });
});
