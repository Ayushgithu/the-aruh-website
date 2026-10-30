import crypto from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { OrderModel } from "@/models/Order";
import { ReturnModel } from "@/models/ReturnRequest";
import { HttpError, ok, readJson, userRoute } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { returnCreateSchema } from "@/lib/validation";
import { getRules } from "@/lib/settings";
import { eligibility } from "@/lib/returns-rules";
import { getOrderReturns, getSizesFor, toReturn } from "@/lib/repo-returns";
import { toOrder } from "@/lib/repo-shop";
import { notifyReturn } from "@/lib/return-notify";

const number = () => { const d = new Date(); const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; return `RT-${ymd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`; };

export const GET = userRoute(async (_req, { params }, user) => {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError("Order not found.", 404);
  return ok({ requests: await getOrderReturns(id, user.id) });
});

/** Customer asks to return (refund) or exchange items from a delivered order. All rules are re-checked here, not trusted from the browser. */
export const POST = userRoute(async (req, { params }, user) => {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError("Order not found.", 404);
  if (!rateLimit(`ret:${user.id}:${clientIp(req)}`, 10, 60 * 60_000)) throw new HttpError("Too many requests. Please try again later.", 429);
  const v = returnCreateSchema.parse(await readJson(req));

  await connectDB();
  const doc = await OrderModel.findOne({ _id: id, user: user.id }).lean();
  if (!doc) throw new HttpError("Order not found.", 404);
  const order = toOrder(doc);
  const rules = await getRules();
  const existing = await getOrderReturns(id, user.id);
  const el = eligibility(order, rules, existing);
  if (el.message && !el.items.some((i) => i.remaining > 0 && (i.canReturn || i.canExchange))) throw new HttpError(el.message, 400);

  if (v.type === "exchange" && v.items.length !== 1) throw new HttpError("Exchange one item at a time.", 400);
  const picked = [] as { index: number; quantity: number }[];
  for (const it of v.items) {
    const row = el.items[it.index];
    if (!row) throw new HttpError("That item is not in this order.", 400);
    if (picked.some((p) => p.index === it.index)) throw new HttpError("Each item can be listed once.", 400);
    const allowed = v.type === "return" ? row.canReturn : row.canExchange;
    if (!allowed) throw new HttpError(`"${order.items[it.index].name}" cannot be ${v.type === "return" ? "returned" : "exchanged"}.`, 400);
    if (it.quantity > row.remaining) throw new HttpError(`You can ${v.type} at most ${row.remaining} of "${order.items[it.index].name}".`, 400);
    picked.push(it);
  }
  if (!rules.returns.reasons.includes(v.reason)) throw new HttpError("Please choose a reason from the list.", 400);

  if (v.type === "return") {
    if (v.refundTo === "wallet" && (!rules.wallet.enabled || user.guest)) throw new HttpError("Refund to wallet is not available for this order. Choose another refund option.", 400);
    if (v.refundTo === "original" && order.payment.method === "cod" && (v.refundDetails ?? "").trim().length < 5) throw new HttpError("Add your UPI ID or bank details so we can send the refund.", 400);
  }
  let exchangeTo: { size?: string; color?: string } | undefined;
  if (v.type === "exchange") {
    const item = order.items[picked[0].index];
    const size = v.exchangeTo?.size;
    if (!size) throw new HttpError("Choose the size you want instead.", 400);
    const sizes = (await getSizesFor([item.productId]))[item.productId] ?? [];
    const target = sizes.find((s) => s.label === size);
    if (!target || target.qty < picked[0].quantity) throw new HttpError(`Size ${size} is not available right now. Please choose another size.`, 409);
    if (size === item.size && (v.exchangeTo?.color ?? item.color) === item.color) throw new HttpError("Choose a different size or colour to exchange.", 400);
    exchangeTo = { size, color: v.exchangeTo?.color || item.color };
  }

  const created = await ReturnModel.create({
    number: number(), order: id, orderNumber: order.orderNumber, user: user.id,
    customer: { name: order.customer.name, email: order.customer.email, phone: order.customer.phone },
    type: v.type, reason: v.reason, comment: v.comment || undefined, photos: v.photos, exchangeTo,
    refundTo: v.type === "return" ? v.refundTo : undefined, refundDetails: v.type === "return" && v.refundTo === "original" && order.payment.method === "cod" ? v.refundDetails : undefined,
    items: picked.map((p) => { const i = order.items[p.index]; return { index: p.index, product: i.productId, slug: i.slug, name: i.name, size: i.size, color: i.color, price: i.price, quantity: p.quantity, image: i.image, art: i.art }; }),
    status: "requested", timeline: [{ status: "requested", at: new Date(), note: "Request submitted by customer" }],
  });
  const rr = toReturn(created.toObject());
  notifyReturn("requested", rr);
  return ok({ request: rr }, 201);
});
