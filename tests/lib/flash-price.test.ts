// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
import { toProduct } from "@/lib/repo";

const doc = (over: Record<string, unknown> = {}) => ({
  _id: "64b7f0c2a1b2c3d4e5f60001", slug: "suit", type: "clothing", name: "Suit", brand: "", price: 2000, mrp: 3000, condition: "New", stock: "in-stock", category: "Suits", quantity: 5, createdAt: new Date(), ...over,
});
const future = () => new Date(Date.now() + 3600_000);

describe("flash sale pricing (the price the customer pays is decided here, on the server)", () => {
  it("while the sale runs, the flash price is THE price and the normal price becomes the strike-through", () => {
    const p = toProduct(doc({ flashPrice: 1200, flashEndsAt: future() }));
    expect(p.price).toBe(1200);
    expect(p.mrp).toBe(3000); // original MRP kept
    expect(p.flash).toMatchObject({ price: 1200 });
    expect(p.base).toEqual({ price: 2000, mrp: 3000 }); // what the dashboard edits
  });
  it("without an MRP, the normal price is shown struck through", () => {
    expect(toProduct(doc({ mrp: undefined, flashPrice: 1200, flashEndsAt: future() })).mrp).toBe(2000);
  });
  it("the moment it ends the normal price is back — nothing to switch off", () => {
    const p = toProduct(doc({ flashPrice: 1200, flashEndsAt: new Date(Date.now() - 1000) }));
    expect(p.price).toBe(2000);
    expect(p.flash).toBeUndefined();
    expect(p.flashRaw).toMatchObject({ price: 1200 }); // dashboard still shows the saved (expired) settings
  });
  it("a flash price that is not lower than the normal price is ignored", () => {
    expect(toProduct(doc({ flashPrice: 2500, flashEndsAt: future() })).price).toBe(2000);
  });
  it("products without a flash sale are untouched", () => {
    const p = toProduct(doc());
    expect(p).toMatchObject({ price: 2000, mrp: 3000 });
    expect(p.flash).toBeUndefined();
  });
});
