// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn(async () => null) }));
vi.mock("@/lib/user-auth", () => ({ getUserSession: vi.fn(async () => null), createUserSession: vi.fn(), destroyUserSession: vi.fn() }));

import * as cart from "@/app/api/cart/route";
import * as cartItem from "@/app/api/cart/[productId]/route";
import * as wishlist from "@/app/api/wishlist/route";
import * as wishlistItem from "@/app/api/wishlist/[productId]/route";
import * as checkout from "@/app/api/checkout/route";
import * as verify from "@/app/api/checkout/verify/route";
import * as pay from "@/app/api/orders/[id]/pay/route";
import * as cancel from "@/app/api/orders/[id]/cancel/route";
import * as profile from "@/app/api/account/profile/route";
import * as password from "@/app/api/account/password/route";
import { ID, ctx, jsonReq } from "./utils";

type H = (req: Request, c: ReturnType<typeof ctx>) => Promise<Response>;
const routes: [string, H, string][] = [
  ["GET /api/cart", cart.GET as H, "GET"],
  ["POST /api/cart", cart.POST as H, "POST"],
  ["DELETE /api/cart", cart.DELETE as H, "DELETE"],
  ["PATCH /api/cart/:id", cartItem.PATCH as H, "PATCH"],
  ["DELETE /api/cart/:id", cartItem.DELETE as H, "DELETE"],
  ["POST /api/wishlist", wishlist.POST as H, "POST"],
  ["DELETE /api/wishlist/:id", wishlistItem.DELETE as H, "DELETE"],
  ["POST /api/checkout", checkout.POST as H, "POST"],
  ["POST /api/checkout/verify", verify.POST as H, "POST"],
  ["POST /api/orders/:id/pay", pay.POST as H, "POST"],
  ["POST /api/orders/:id/cancel", cancel.POST as H, "POST"],
  ["PATCH /api/account/profile", profile.PATCH as H, "PATCH"],
  ["POST /api/account/password", password.POST as H, "POST"],
];

describe("every customer-only API route rejects signed-out visitors", () => {
  it.each(routes)("%s → 401", async (_n, handler, method) => {
    const res = await handler(jsonReq("/api/x", method, method === "GET" ? undefined : {}), ctx({ id: ID, productId: ID }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/sign in/i);
  });
});
