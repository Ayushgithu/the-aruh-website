import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { getUserSession } from "@/lib/user-auth";
import { getCartLines } from "@/lib/repo-shop";

export const dynamic = "force-dynamic";

/** Everything the site header needs in one call: who is signed in, their cart and wishlist. */
export async function GET() {
  const empty = { user: null, cart: [], wishlist: [], address: null };
  try {
    const user = await getUserSession();
    if (!user) return Response.json(empty, { headers: { "Cache-Control": "no-store" } });
    await connectDB();
    const [cart, doc] = await Promise.all([getCartLines(user.id), UserModel.findById(user.id).select("wishlist lastAddress").lean()]);
    return Response.json({ user, cart, wishlist: ((doc?.wishlist ?? []) as unknown[]).map(String), address: (doc as { lastAddress?: unknown } | null)?.lastAddress ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(empty, { headers: { "Cache-Control": "no-store" } }); // database/config problem: behave as signed out
  }
}
