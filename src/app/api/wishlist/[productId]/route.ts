import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { ok, userRoute } from "@/lib/api-helpers";

export const DELETE = userRoute(async (_req, { params }, user) => {
  await connectDB();
  await UserModel.updateOne({ _id: user.id }, { $pull: { wishlist: (await params).productId } });
  return ok({ ok: true });
});
