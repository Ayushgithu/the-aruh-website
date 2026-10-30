import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { HttpError, ok, readJson, userRoute } from "@/lib/api-helpers";
import { getAddresses } from "@/lib/repo-shop";
import { normalizePhone, savedAddressSchema } from "@/lib/validation";

const MAX = 8;

export const GET = userRoute(async (_req, _ctx, user) => ok({ addresses: await getAddresses(user.id) }));

export const POST = userRoute(async (req, _ctx, user) => {
  const v = savedAddressSchema.parse(await readJson(req));
  await connectDB();
  const u = await UserModel.findById(user.id);
  if (!u) throw new HttpError("Account not found.", 404);
  if ((u.addresses?.length ?? 0) >= MAX) throw new HttpError(`You can save up to ${MAX} addresses. Please delete one first.`, 400);
  const makeDefault = v.isDefault || !u.addresses?.length;
  if (makeDefault) u.addresses.forEach((a: { isDefault?: boolean }) => { a.isDefault = false; });
  u.addresses.push({ label: v.label, name: v.name, phone: normalizePhone(v.phone), line1: v.line1, line2: v.line2 || undefined, city: v.city, state: v.state, pincode: v.pincode, isDefault: makeDefault });
  await u.save();
  return ok({ addresses: await getAddresses(user.id) }, 201);
});
