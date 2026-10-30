import { z } from "zod";
import { ok, readJson, userRoute } from "@/lib/api-helpers";
import { removeFromCart, setCartQuantity } from "@/lib/cart";

const variant = z.object({ size: z.string().trim().max(12).optional(), color: z.string().trim().max(30).optional() });

export const PATCH = userRoute(async (req, { params }, user) => {
  const body = await readJson(req);
  const { quantity } = z.object({ quantity: z.coerce.number().int().min(1).max(20) }).parse(body);
  const { size, color } = variant.parse(body);
  return ok({ cart: await setCartQuantity(user.id, (await params).productId, quantity, size, color) });
});

export const DELETE = userRoute(async (req, { params }, user) => {
  const body = await readJson(req).catch(() => ({}));
  const { size, color } = variant.parse(body ?? {});
  return ok({ cart: await removeFromCart(user.id, (await params).productId, size, color) });
});
