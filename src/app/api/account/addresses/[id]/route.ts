import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { HttpError, ok, readJson, userRoute } from "@/lib/api-helpers";
import { getAddresses } from "@/lib/repo-shop";
import { normalizePhone, savedAddressSchema } from "@/lib/validation";

async function load(userId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError("Address not found.", 404);
  await connectDB();
  const u = await UserModel.findById(userId);
  const a = u?.addresses?.id(id);
  if (!u || !a) throw new HttpError("Address not found.", 404);
  return { u, a };
}

export const PUT = userRoute(async (req, { params }, user) => {
  const v = savedAddressSchema.parse(await readJson(req));
  const { u, a } = await load(user.id, (await params).id);
  if (v.isDefault) u.addresses.forEach((x: { isDefault?: boolean }) => { x.isDefault = false; });
  Object.assign(a, { label: v.label, name: v.name, phone: normalizePhone(v.phone), line1: v.line1, line2: v.line2 || undefined, city: v.city, state: v.state, pincode: v.pincode, isDefault: v.isDefault ?? a.isDefault });
  await u.save();
  return ok({ addresses: await getAddresses(user.id) });
});

export const DELETE = userRoute(async (_req, { params }, user) => {
  const { u, a } = await load(user.id, (await params).id);
  const wasDefault = a.isDefault;
  a.deleteOne();
  if (wasDefault && u.addresses.length) u.addresses[0].isDefault = true;
  await u.save();
  return ok({ addresses: await getAddresses(user.id) });
});
