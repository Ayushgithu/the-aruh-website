import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { normalizePhone, profileSchema } from "@/lib/validation";
import { ok, readJson, userRoute } from "@/lib/api-helpers";

export const PATCH = userRoute(async (req, _ctx, user) => {
  const v = profileSchema.parse(await readJson(req));
  await connectDB();
  const phone = normalizePhone(v.phone);
  await UserModel.updateOne({ _id: user.id }, { name: v.name, phone });
  return ok({ user: { ...user, name: v.name, phone } });
});
