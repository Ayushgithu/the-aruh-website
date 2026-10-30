import mongoose from "mongoose";
import { connectDB } from "./db";
import { CartModel } from "@/models/Cart";
import { ProductModel } from "@/models/Product";
import { HttpError } from "./api-helpers";
import { unitsOf } from "./repo";
import { getCartLines } from "./repo-shop";

const MAX_PER_LINE = 10;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadProduct(productId: string) {
  if (!mongoose.isValidObjectId(productId)) throw new HttpError("Product not found.", 404);
  await connectDB();
  const p: any = await ProductModel.findById(productId).select("name quantity stock stockCount sizes").lean();
  if (!p) throw new HttpError("This product is no longer available.", 404);
  return p;
}

/** Units that can be bought for this exact size (or the whole product when it has no sizes). */
function stockFor(p: any, size?: string) {
  const sizes: { label: string; qty: number }[] = Array.isArray(p.sizes) ? p.sizes : [];
  if (sizes.length === 0) return unitsOf(p);
  if (!size) throw new HttpError("Please choose a size.", 400);
  const s = sizes.find((x) => x.label === size);
  if (!s) throw new HttpError(`Size ${size} is not available for ${p.name}.`, 400);
  return s.qty;
}

const same = (i: any, productId: string, size?: string, color?: string) =>
  String(i.product) === productId && (i.size ?? "") === (size ?? "") && (i.color ?? "") === (color ?? "");

/** Adds to the customer's cart. Quantity is capped by what is in stock for that size. */
export async function addToCart(userId: string, productId: string, quantity = 1, size?: string, color?: string) {
  const p = await loadProduct(productId);
  const stock = stockFor(p, size);
  if (stock <= 0) throw new HttpError(`${p.name}${size ? ` (${size})` : ""} is sold out.`, 409);

  const cart = (await CartModel.findOne({ user: userId })) ?? new CartModel({ user: userId, items: [] });
  const line = cart.items.find((i: any) => same(i, productId, size, color));
  const next = Math.min((line?.quantity ?? 0) + quantity, stock, MAX_PER_LINE);
  if (line) line.quantity = next;
  else cart.items.push({ product: productId, size: size || undefined, color: color || undefined, quantity: next, addedAt: new Date() });
  await cart.save();
  return getCartLines(userId);
}

export async function setCartQuantity(userId: string, productId: string, quantity: number, size?: string, color?: string) {
  const p = await loadProduct(productId);
  const cart = await CartModel.findOne({ user: userId });
  const line = cart?.items.find((i: any) => same(i, productId, size, color));
  if (!cart || !line) throw new HttpError("That item is not in your cart.", 404);
  line.quantity = Math.max(1, Math.min(quantity, stockFor(p, size) || 1, MAX_PER_LINE));
  await cart.save();
  return getCartLines(userId);
}

export async function removeFromCart(userId: string, productId: string, size?: string, color?: string) {
  await connectDB();
  const cart: any = await CartModel.findOne({ user: userId });
  if (cart) {
    cart.items = cart.items.filter((i: any) => !same(i, productId, size, color));
    await cart.save();
  }
  return getCartLines(userId);
}

export async function clearCart(userId: string) {
  await connectDB();
  await CartModel.updateOne({ user: userId }, { $set: { items: [] } });
}

/** When a guest signs in, the items they already put in the bag move to their account. */
export async function mergeGuestCart(guestId: string, userId: string) {
  await connectDB();
  const g: any = await CartModel.findOne({ user: guestId });
  if (!g?.items?.length) return;
  const cart: any = (await CartModel.findOne({ user: userId })) ?? new CartModel({ user: userId, items: [] });
  for (const it of g.items) {
    const line = cart.items.find((i: any) => same(i, String(it.product), it.size || undefined, it.color || undefined));
    if (line) line.quantity = Math.min(line.quantity + it.quantity, MAX_PER_LINE);
    else cart.items.push({ product: it.product, size: it.size, color: it.color, quantity: it.quantity, addedAt: it.addedAt ?? new Date() });
  }
  await cart.save();
  await CartModel.updateOne({ user: guestId }, { $set: { items: [] } });
}
