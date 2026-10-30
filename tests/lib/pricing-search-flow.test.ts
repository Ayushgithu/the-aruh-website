import { describe, expect, it } from "vitest";
import { COD_MAX, FREE_SHIPPING_ABOVE, SHIPPING_FEE, codAvailable, computeTotals } from "@/lib/pricing";
import { editDistance, matchWord, normalize, scoreProduct, searchProducts, type Searchable } from "@/lib/search";
import { canTransition, customerCanCancel, nextStatuses } from "@/lib/order-flow";

describe("pricing", () => {
  it("laptop orders always ship free", () => {
    expect(computeTotals([{ price: 14999, quantity: 1, type: "laptop" }])).toEqual({ subtotal: 14999, shipping: 0, total: 14999 });
  });
  it("accessories below the threshold pay shipping", () => {
    expect(computeTotals([{ price: 599, quantity: 1, type: "accessory" }])).toEqual({ subtotal: 599, shipping: SHIPPING_FEE, total: 599 + SHIPPING_FEE });
  });
  it("accessories at or above the threshold ship free", () => {
    expect(computeTotals([{ price: FREE_SHIPPING_ABOVE, quantity: 1, type: "accessory" }]).shipping).toBe(0);
    expect(computeTotals([{ price: 1000, quantity: 2, type: "accessory" }]).shipping).toBe(0);
  });
  it("multiplies by quantity and sums lines", () => {
    expect(computeTotals([{ price: 1500, quantity: 2, type: "accessory" }, { price: 20000, quantity: 1, type: "laptop" }]).subtotal).toBe(23000);
  });
  it("an empty cart costs nothing", () => {
    expect(computeTotals([])).toEqual({ subtotal: 0, shipping: 0, total: 0 });
  });
  it("cash on delivery has an upper limit", () => {
    expect(codAvailable(COD_MAX)).toBe(true);
    expect(codAvailable(COD_MAX + 1)).toBe(false);
  });
});

const p = (over: Partial<Searchable>): Searchable => ({ name: "", brand: "", category: "", tags: [], specs: {}, highlights: [], ...over });
const catalog: Searchable[] = [
  p({ name: "Dell Latitude 5420", brand: "Dell", category: "Business", cpu: "Intel Core i5", specs: { RAM: "16 GB DDR4", Storage: "512 GB SSD" }, highlights: ["Core i5 · 11th Gen", "16 GB RAM"] }),
  p({ name: "HP EliteBook 840 G7", brand: "HP", category: "Business", cpu: "Intel Core i7", specs: { RAM: "16 GB", Storage: "512 GB" } }),
  p({ name: "Apple MacBook Air M1 (2020)", brand: "Apple", category: "Premium", cpu: "Apple M1", specs: { RAM: "8 GB" } }),
  p({ name: "ASUS TUF Gaming F15", brand: "ASUS", category: "Gaming", tags: ["gaming", "student"], specs: { Graphics: "NVIDIA RTX 3050" } }),
  p({ name: "Logitech M331 Silent Mouse", brand: "Logitech", category: "Mouse" }),
  p({ name: "Dell 65W USB-C Charger", brand: "Dell", category: "Chargers" }),
];
const names = (q: string) => searchProducts(catalog, q).map((x) => x.name);

describe("fuzzy search", () => {
  it("normalizes case, punctuation and accents", () => {
    expect(normalize("  Dell™  Latitude-5420! ")).toBe("dell latitude 5420");
    expect(normalize("Café")).toBe("cafe");
  });

  it("edit distance counts a swapped pair as one edit", () => {
    expect(editDistance("latitude", "latiutde", 2)).toBe(1);
    expect(editDistance("dell", "dell", 2)).toBe(0);
    expect(editDistance("abc", "xyzxyz", 1)).toBeGreaterThan(1);
  });

  it("matches words exactly, by prefix, and with typos", () => {
    expect(matchWord("dell", "dell")).toBe(1);
    expect(matchWord("lat", "latitude")).toBeGreaterThan(0.9);
    expect(matchWord("latitde", "latitude")).toBeGreaterThan(0.4);
    expect(matchWord("zzzz", "latitude")).toBe(0);
  });

  it("finds products by name", () => expect(names("macbook")).toEqual(["Apple MacBook Air M1 (2020)"]));
  it("tolerates a typo", () => expect(names("latitde")[0]).toBe("Dell Latitude 5420"));
  it("tolerates a swapped-letter typo", () => expect(names("macobok")[0]).toBe("Apple MacBook Air M1 (2020)"));
  it("finds by brand", () => expect(names("dell")).toEqual(expect.arrayContaining(["Dell Latitude 5420", "Dell 65W USB-C Charger"])));
  it("needs EVERY word to match: 'dell i5' excludes other Dell products", () => {
    expect(names("dell i5")).toEqual(["Dell Latitude 5420"]);
  });
  it("understands spec-style queries like '16gb'", () => {
    expect(names("16gb")).toEqual(expect.arrayContaining(["Dell Latitude 5420", "HP EliteBook 840 G7"]));
    expect(names("16gb")).not.toContain("Apple MacBook Air M1 (2020)");
  });
  it("combines typos and specs: 'dell latitde i5 16gb'", () => expect(names("dell latitde i5 16gb")).toEqual(["Dell Latitude 5420"]));
  it("matches tags and categories", () => {
    expect(names("gaming")).toEqual(["ASUS TUF Gaming F15"]);
    expect(names("student")).toEqual(["ASUS TUF Gaming F15"]);
    expect(names("chargers")).toEqual(["Dell 65W USB-C Charger"]);
  });
  it("finds by graphics card", () => expect(names("rtx 3050")).toEqual(["ASUS TUF Gaming F15"]));
  it("ranks a name match above a spec-only match", () => {
    const r = searchProducts([p({ name: "Dell Charger", brand: "Dell" }), p({ name: "Laptop Bag", brand: "X", specs: { Fits: "Dell laptops" } })], "dell");
    expect(r[0].name).toBe("Dell Charger");
  });
  it("returns nothing for gibberish, empty or one-letter queries", () => {
    expect(names("qqqqzzzz")).toEqual([]);
    expect(names("")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });
  it("respects the limit", () => expect(searchProducts(catalog, "dell", 1)).toHaveLength(1));
  it("scores 0 when any word has no match", () => expect(scoreProduct(catalog[0], "dell banana")).toBe(0));
});

describe("order status flow", () => {
  it("allows the normal path", () => {
    expect(canTransition("placed", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });
  it("blocks skipping steps and going backwards", () => {
    expect(canTransition("placed", "shipped")).toBe(false);
    expect(canTransition("placed", "delivered")).toBe(false);
    expect(canTransition("delivered", "shipped")).toBe(false);
  });
  it("delivered and cancelled are final", () => {
    expect(nextStatuses("delivered")).toEqual([]);
    expect(nextStatuses("cancelled")).toEqual([]);
  });
  it("can cancel until it ships", () => {
    expect(["pending_payment", "placed", "confirmed"].every((s) => canTransition(s as never, "cancelled"))).toBe(true);
    expect(canTransition("shipped", "cancelled")).toBe(true); // admin only; customers are blocked below
  });
  it("customers can only cancel before shipping", () => {
    expect(customerCanCancel("placed")).toBe(true);
    expect(customerCanCancel("confirmed")).toBe(true);
    expect(customerCanCancel("pending_payment")).toBe(true);
    expect(customerCanCancel("shipped")).toBe(false);
    expect(customerCanCancel("delivered")).toBe(false);
  });
});
