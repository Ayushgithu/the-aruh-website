import { cartAddSchema } from "@/lib/validation";
import { ok, readJson, userRoute } from "@/lib/api-helpers";
import { addToCart, clearCart } from "@/lib/cart";
import { getCartLines } from "@/lib/repo-shop";
import { connectDB } from "@/lib/db";

export const GET = userRoute(async (_req, _ctx, user) => {
  await connectDB();
  return ok({ cart: await getCartLines(user.id) });
});

export const POST = userRoute(async (req, _ctx, user) => {
  const v = cartAddSchema.parse(await readJson(req));
  return ok({ cart: await addToCart(user.id, v.productId, v.quantity, v.size, v.color) });
});

export const DELETE = userRoute(async (_req, _ctx, user) => {
  await clearCart(user.id);
  return ok({ cart: [] });
});
