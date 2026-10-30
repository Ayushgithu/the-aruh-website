import { connectDB } from "./db";
import { ReturnModel } from "@/models/ReturnRequest";
import { ProductModel } from "@/models/Product";
import type { ReturnRequest } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = any;
const iso = (d: unknown) => (d ? new Date(d as string | number | Date).toISOString() : new Date().toISOString());

export function toReturn(d: Doc): ReturnRequest {
  return {
    id: String(d._id), number: d.number, orderId: String(d.order), orderNumber: d.orderNumber ?? "", userId: String(d.user),
    customer: { name: d.customer?.name ?? "", email: d.customer?.email ?? "", phone: d.customer?.phone ?? "" },
    type: d.type, reason: d.reason, comment: d.comment || undefined, photos: d.photos ?? [],
    items: (d.items ?? []).map((i: Doc) => ({ index: i.index, productId: String(i.product), slug: i.slug ?? "", name: i.name, size: i.size || undefined, color: i.color || undefined, price: i.price, quantity: i.quantity, image: i.image || undefined, art: i.art })),
    exchangeTo: d.exchangeTo?.size || d.exchangeTo?.color ? { size: d.exchangeTo.size || undefined, color: d.exchangeTo.color || undefined } : undefined,
    status: d.status, refundTo: d.refundTo || undefined, refundDetails: d.refundDetails || undefined,
    pickup: d.pickup?.awb || d.pickup?.carrier ? { carrier: d.pickup.carrier || undefined, awb: d.pickup.awb || undefined, url: d.pickup.url || undefined } : undefined,
    refund: d.refund?.amount ? { amount: d.refund.amount, bonus: d.refund.bonus || undefined, method: d.refund.method, refundId: d.refund.refundId || undefined, note: d.refund.note || undefined, at: d.refund.at ? iso(d.refund.at) : undefined } : undefined,
    exchangeShipment: d.exchangeShipment?.awb || d.exchangeShipment?.carrier ? { carrier: d.exchangeShipment.carrier || undefined, awb: d.exchangeShipment.awb || undefined, url: d.exchangeShipment.url || undefined } : undefined,
    restocked: !!d.restocked, adminNote: d.adminNote || undefined,
    timeline: (d.timeline ?? []).map((t: Doc) => ({ status: t.status, at: iso(t.at), note: t.note || undefined, by: t.by || undefined })),
    createdAt: iso(d.createdAt),
  };
}

export async function getOrderReturns(orderId: string, userId?: string): Promise<ReturnRequest[]> {
  await connectDB();
  const q: Doc = { order: orderId };
  if (userId) q.user = userId;
  return (await ReturnModel.find(q).sort({ createdAt: -1 }).lean()).map(toReturn);
}

/** Current per-size stock of the given products, used to offer exchange sizes that are actually available. */
export async function getSizesFor(ids: string[]): Promise<Record<string, { label: string; qty: number }[]>> {
  if (!ids.length) return {};
  await connectDB();
  const docs: Doc[] = await ProductModel.find({ _id: { $in: ids } }).select("sizes").lean();
  return Object.fromEntries(docs.map((d) => [String(d._id), (d.sizes ?? []).map((s: Doc) => ({ label: s.label, qty: s.qty ?? 0 }))]));
}
