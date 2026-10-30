import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { passwordSchema } from "@/lib/validation";
import { HttpError, ok, readJson, userRoute } from "@/lib/api-helpers";

export const POST = userRoute(async (req, _ctx, user) => {
  const v = passwordSchema.parse(await readJson(req));
  await connectDB();
  const doc = await UserModel.findById(user.id);
  if (!doc || !(await bcrypt.compare(v.current, doc.passwordHash))) throw new HttpError("Your current password is incorrect.", 400);
  doc.passwordHash = await bcrypt.hash(v.next, 10);
  await doc.save();
  return ok({ ok: true });
});
