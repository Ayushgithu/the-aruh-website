import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { ProductModel } from "@/models/Product";
import { HttpError, ok, readJson, userRoute } from "@/lib/api-helpers";

export const POST = userRoute(async (req, _ctx, user) => {
  const { productId } = z.object({ productId: z.string() }).parse(await readJson(req));
  if (!mongoose.isValidObjectId(productId)) throw new HttpError("Product not found.", 404);
  await connectDB();
  if (!(await ProductModel.exists({ _id: productId }))) throw new HttpError("Product not found.", 404);
  await UserModel.updateOne({ _id: user.id }, { $addToSet: { wishlist: productId } });
  return ok({ ok: true }, 201);
});
