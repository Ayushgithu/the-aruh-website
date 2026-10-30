import crypto from "node:crypto";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { HttpError, ok, userRoute } from "@/lib/api-helpers";

/** Creates (or returns) the public link to the customer's wishlist. */
export const POST = userRoute(async (_req, _ctx, user) => {
  await connectDB();
  const u = await UserModel.findById(user.id).select("shareToken");
  if (!u) throw new HttpError("Account not found.", 404);
  if (!u.shareToken) { u.shareToken = crypto.randomBytes(12).toString("hex"); await u.save(); }
  return ok({ path: `/wishlist/s/${u.shareToken}` });
});

/** Turns the public link off. */
export const DELETE = userRoute(async (_req, _ctx, user) => {
  await connectDB();
  await UserModel.updateOne({ _id: user.id }, { $unset: { shareToken: "" } });
  return ok({ ok: true });
});
