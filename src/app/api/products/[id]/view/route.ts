import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ProductModel } from "@/models/Product";
import { ok, publicRoute } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const POST = publicRoute(async (req, { params }) => {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id) || !rateLimit(`view:${clientIp(req)}:${id}`, 3, 60 * 60_000)) return ok({ ok: true });
  await connectDB();
  await ProductModel.updateOne({ _id: id }, { $inc: { views: 1 } });
  return ok({ ok: true });
});
