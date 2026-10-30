// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
const h = vi.hoisted(() => {
  const CartCtor: any = function (this: any, d: any) { Object.assign(this, d); this.save = (globalThis as any).__save; };
  CartCtor.findOne = (() => {}) as any;
  CartCtor.updateOne = (() => {}) as any;
  return { CartCtor };
});
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/user-auth", () => ({ getUserSession: vi.fn() }));
vi.mock("@/lib/repo-shop", () => ({ getCartLines: vi.fn(async () => []) }));
vi.mock("@/lib/repo", async (orig) => ({ ...(await orig<typeof import("@/lib/repo")>()), searchCatalog: vi.fn() }));
vi.mock("@/models/Cart", () => ({ CartModel: h.CartCtor }));
vi.mock("@/models/Product", () => ({ ProductModel: { findById: vi.fn() } }));

import { ProductModel } from "@/models/Product";
import { searchCatalog } from "@/lib/repo";
import { addToCart, removeFromCart, setCartQuantity } from "@/lib/cart";
import { GET as search } from "@/app/api/search/route";
import { ID, ctx, freshIp, jsonReq } from "./utils";

const Product = ProductModel as any;
const Cart = h.CartCtor;
const stock = (n: number | undefined, extra: any = {}) => Product.findById.mockReturnValue({ select: () => ({ lean: async () => ({ name: "Dell Latitude", quantity: n, ...extra }) }) });
const cartDoc = (items: any[]) => ({ items, save: vi.fn() });

beforeEach(() => {
  Cart.updateOne = vi.fn();
  (globalThis as any).__save = vi.fn();
});

describe("cart rules", () => {
  it("adds a new line", async () => {
    stock(5);
    Cart.findOne = vi.fn(async () => null);
    await addToCart("u1", ID, 1);
    // a new cart document is created and saved
    expect((globalThis as any).__save).toHaveBeenCalled();
  });

  it("adding again increases the quantity but never beyond what is in stock", async () => {
    stock(3);
    const doc = cartDoc([{ product: ID, quantity: 2 }]);
    Cart.findOne = vi.fn(async () => doc);
    await addToCart("u1", ID, 5);
    expect(doc.items[0].quantity).toBe(3);
    expect(doc.save).toHaveBeenCalled();
  });

  it("never more than 10 of one item", async () => {
    stock(50);
    const doc = cartDoc([{ product: ID, quantity: 9 }]);
    Cart.findOne = vi.fn(async () => doc);
    await addToCart("u1", ID, 5);
    expect(doc.items[0].quantity).toBe(10);
  });

  it("a sold-out product cannot be added", async () => {
    stock(0);
    await expect(addToCart("u1", ID, 1)).rejects.toMatchObject({ status: 409, message: expect.stringContaining("sold out") });
  });

  it("older products without a quantity fall back to their stock label", async () => {
    stock(undefined, { stock: "out" });
    await expect(addToCart("u1", ID, 1)).rejects.toMatchObject({ status: 409 });
  });

  it("unknown or malformed products are a 404", async () => {
    await expect(addToCart("u1", "nope", 1)).rejects.toMatchObject({ status: 404 });
    Product.findById.mockReturnValue({ select: () => ({ lean: async () => null }) });
    await expect(addToCart("u1", ID, 1)).rejects.toMatchObject({ status: 404 });
  });

  it("setting a quantity is capped by stock and at least 1", async () => {
    stock(4);
    const doc = cartDoc([{ product: ID, quantity: 1 }]);
    Cart.findOne = vi.fn(async () => doc);
    await setCartQuantity("u1", ID, 9);
    expect(doc.items[0].quantity).toBe(4);
    await setCartQuantity("u1", ID, 0);
    expect(doc.items[0].quantity).toBe(1);
  });

  it("cannot set the quantity of something that is not in the cart", async () => {
    stock(4);
    Cart.findOne = vi.fn(async () => cartDoc([]));
    await expect(setCartQuantity("u1", ID, 2)).rejects.toMatchObject({ status: 404 });
  });

  it("removing drops only that line from the customer's own cart", async () => {
    const doc = cartDoc([{ product: ID, quantity: 1 }, { product: "other", quantity: 1 }]);
    Cart.findOne = vi.fn(async () => doc);
    await removeFromCart("u1", ID);
    expect(Cart.findOne).toHaveBeenCalledWith({ user: "u1" });
    expect(doc.items).toEqual([{ product: "other", quantity: 1 }]);
    expect(doc.save).toHaveBeenCalled();
  });

  describe("sizes (clothing)", () => {
    const sized = { sizes: [{ label: "S", qty: 0 }, { label: "M", qty: 2 }] };
    it("a size is required when the product has sizes", async () => {
      stock(2, sized);
      Cart.findOne = vi.fn(async () => null);
      await expect(addToCart("u1", ID, 1)).rejects.toMatchObject({ status: 400 });
    });
    it("a size that does not exist is rejected", async () => {
      stock(2, sized);
      Cart.findOne = vi.fn(async () => null);
      await expect(addToCart("u1", ID, 1, "XXL")).rejects.toMatchObject({ status: 400 });
    });
    it("a sold-out size cannot be added", async () => {
      stock(2, sized);
      Cart.findOne = vi.fn(async () => null);
      await expect(addToCart("u1", ID, 1, "S")).rejects.toMatchObject({ status: 409 });
    });
    it("quantity is capped by that size's stock, and sizes are separate lines", async () => {
      stock(2, sized);
      const doc = cartDoc([{ product: ID, size: "M", quantity: 1 }]);
      Cart.findOne = vi.fn(async () => doc);
      await addToCart("u1", ID, 5, "M");
      expect(doc.items).toHaveLength(1);
      expect(doc.items[0].quantity).toBe(2);
    });
    it("removing one size leaves the other size in the bag", async () => {
      const doc = cartDoc([{ product: ID, size: "M", quantity: 1 }, { product: ID, size: "L", quantity: 1 }]);
      Cart.findOne = vi.fn(async () => doc);
      await removeFromCart("u1", ID, "M");
      expect(doc.items).toEqual([{ product: ID, size: "L", quantity: 1 }]);
    });
  });
});

describe("GET /api/search", () => {
  const get = (q: string, ip = freshIp()) => search(new Request(`http://localhost/api/search?q=${encodeURIComponent(q)}`, { headers: { "x-forwarded-for": ip } }), ctx());

  it("returns light-weight suggestions", async () => {
    vi.mocked(searchCatalog).mockResolvedValue([{ id: "1", slug: "dell", name: "Dell Latitude", brand: "Dell", price: 100, type: "laptop", stock: "in-stock", art: { kind: "laptop", tone: "silver", hue: 1 }, images: ["/api/images/x"], specs: { secret: "x" } }] as any);
    const body = await (await get("latitde")).json();
    expect(body.results).toEqual([{ id: "1", slug: "dell", name: "Dell Latitude", brand: "Dell", price: 100, type: "laptop", stock: "in-stock", art: expect.anything(), image: "/api/images/x" }]);
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("does not search for fewer than 2 characters", async () => {
    vi.mocked(searchCatalog).mockClear();
    expect(await (await get("d")).json()).toEqual({ results: [] });
    expect(searchCatalog).not.toHaveBeenCalled();
  });

  it("is rate-limited per visitor", async () => {
    vi.mocked(searchCatalog).mockResolvedValue([]);
    vi.mocked(searchCatalog).mockClear();
    const ip = freshIp();
    for (let i = 0; i < 125; i++) await get("dell", ip);
    expect(vi.mocked(searchCatalog).mock.calls.length).toBe(120);
  });
});
