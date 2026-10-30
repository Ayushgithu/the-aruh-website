import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ReturnModel } from "@/models/ReturnRequest";
import { HttpError, ok, userRoute } from "@/lib/api-helpers";

/** The customer can withdraw a request until we start working on it. */
export const DELETE = userRoute(async (_req, { params }, user) => {
  const { id, rid } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(rid)) throw new HttpError("Request not found.", 404);
  await connectDB();
  const r = await ReturnModel.updateOne(
    { _id: rid, order: id, user: user.id, status: "requested" },
    { $set: { status: "cancelled" }, $push: { timeline: { status: "cancelled", at: new Date(), note: "Withdrawn by customer" } } },
  );
  if (r.modifiedCount !== 1) throw new HttpError("This request can no longer be withdrawn.", 409);
  return ok({ ok: true });
});
