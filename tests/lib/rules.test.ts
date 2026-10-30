import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, codStatus, computeTotals, dayLabel, deliveryText, estimateDelivery, mergeRules, pincodeListed, recommendSize } from "@/lib/rules";
import { eligibility } from "@/lib/returns-rules";
import { trackingUrl } from "@/lib/tracking";
import { parseVideo } from "@/lib/video";

describe("mergeRules", () => {
  it("fills in defaults, keeps what the owner saved, and replaces lists instead of merging them", () => {
    const r = mergeRules({ shipping: { fee: 99 }, cod: { advance: 150, blockedPincodes: ["7940"] } } as any);
    expect(r.shipping).toEqual({ freeAbove: 999, fee: 99 });
    expect(r.cod).toMatchObject({ enabled: true, advance: 150, blockedPincodes: ["7940"] });
    expect(r.returns.reasons.length).toBeGreaterThan(3);
    expect(mergeRules(null)).toEqual(DEFAULT_RULES);
  });
  it("never ends up with an empty reasons list or size chart", () => {
    const r = mergeRules({ returns: { reasons: [] }, sizeAdvisor: { rows: [] } } as any);
    expect(r.returns.reasons.length).toBeGreaterThan(0);
    expect(r.sizeAdvisor.rows.length).toBeGreaterThan(0);
  });
});

describe("pincodeListed / codStatus", () => {
  it("matches a full pincode or a prefix", () => {
    expect(pincodeListed("411001", ["411001"])).toBe(true);
    expect(pincodeListed("411002", ["411001"])).toBe(false);
    expect(pincodeListed("794101", ["7941"])).toBe(true);
    expect(pincodeListed("794101", ["7941*"])).toBe(true);
    expect(pincodeListed("794101", ["", "abc"])).toBe(false);
  });
  it("COD can be off, over the limit, or blocked for a pincode", () => {
    const rules = mergeRules({ cod: { max: 5000, blockedPincodes: ["79"] } } as any);
    expect(codStatus(1000, "110001", rules)).toEqual({ ok: true });
    expect(codStatus(6000, "110001", rules)).toEqual({ ok: false, reason: "limit" });
    expect(codStatus(1000, "794101", rules)).toEqual({ ok: false, reason: "pincode" });
    expect(codStatus(1000, "110001", mergeRules({ cod: { enabled: false } } as any))).toEqual({ ok: false, reason: "disabled" });
  });
});

describe("computeTotals uses the owner's delivery rules", () => {
  it("charges the fee below the free-shipping amount only", () => {
    const rules = mergeRules({ shipping: { freeAbove: 1500, fee: 60 } } as any);
    expect(computeTotals([{ price: 1000, quantity: 1 }], rules)).toEqual({ subtotal: 1000, shipping: 60, total: 1060 });
    expect(computeTotals([{ price: 1000, quantity: 2 }], rules).shipping).toBe(0);
  });
});

describe("recommendSize", () => {
  const rows = DEFAULT_RULES.sizeAdvisor.rows;
  const all = ["XS", "S", "M", "L", "XL", "XXL"].map((label) => ({ label, qty: 5 }));
  it("picks the size whose height and weight ranges fit", () => {
    expect(recommendSize(160, 56, rows, "regular", all)?.size).toBe("M");
    expect(recommendSize(150, 42, rows, "regular", all)?.size).toBe("XS");
    expect(recommendSize(165, 70, rows, "regular", all)?.size).toBe("XL");
  });
  it("relaxed goes one size up", () => {
    expect(recommendSize(160, 56, rows, "relaxed", all)?.size).toBe("L");
  });
  it("only suggests a size that is in stock, preferring the larger neighbour", () => {
    const noM = all.map((s) => (s.label === "M" ? { ...s, qty: 0 } : s));
    const r = recommendSize(160, 56, rows, "regular", noM)!;
    expect(r.size).toBe("L");
    expect(r.note).toContain("sold out");
  });
  it("says so when everything is sold out, and returns nothing for bad input", () => {
    expect(recommendSize(160, 56, rows, "regular", all.map((s) => ({ ...s, qty: 0 })))?.inStock).toBe(false);
    expect(recommendSize(0, 56, rows)).toBeNull();
    expect(recommendSize(160, 56, [])).toBeNull();
  });
});

describe("return / exchange eligibility", () => {
  const day = 86_400_000;
  const now = Date.parse("2026-06-20T10:00:00Z");
  const order = (over: any = {}) => ({
    status: "delivered" as const, deliveredAt: new Date(now - 3 * day).toISOString(), timeline: [],
    items: [{ productId: "p1", slug: "a", name: "A", brand: "", price: 1000, quantity: 2, size: "M", art: { kind: "cloth", tone: "silver", hue: 1 } }, { productId: "p2", slug: "b", name: "B", brand: "", price: 500, quantity: 1, art: { kind: "hub", tone: "silver", hue: 1 }, returnable: false, exchangeable: false }],
    ...over,
  });
  const rules = DEFAULT_RULES;

  it("opens after delivery and honours the per-product switches", () => {
    const e = eligibility(order() as any, rules, [], now);
    expect(e.items[0]).toMatchObject({ remaining: 2, canReturn: true, canExchange: true });
    expect(e.items[1]).toMatchObject({ canReturn: false, canExchange: false }); // owner switched these off for this product
  });
  it("is closed before delivery and after the window", () => {
    expect(eligibility(order({ status: "shipped" }) as any, rules, [], now).message).toMatch(/delivered/);
    expect(eligibility(order({ deliveredAt: new Date(now - 10 * day).toISOString() }) as any, rules, [], now).items).toEqual([]);
  });
  it("return and exchange windows are separate", () => {
    const r = mergeRules({ returns: { returnDays: 3, exchangeDays: 10 } } as any);
    const e = eligibility(order({ deliveredAt: new Date(now - 5 * day).toISOString() }) as any, r, [], now);
    expect(e.returnOpen).toBe(false);
    expect(e.exchangeOpen).toBe(true);
    expect(e.items[0]).toMatchObject({ canReturn: false, canExchange: true });
  });
  it("units already requested are not offered again, but rejected / cancelled requests free them", () => {
    const used = [{ status: "approved", items: [{ index: 0, quantity: 1 }] }, { status: "rejected", items: [{ index: 0, quantity: 1 }] }];
    expect(eligibility(order() as any, rules, used as any, now).items[0].remaining).toBe(1);
  });
  it("the owner can switch returns off entirely or allow exchange only", () => {
    expect(eligibility(order() as any, mergeRules({ returns: { enabled: false } } as any), [], now).message).toMatch(/not available/);
    const e = eligibility(order() as any, mergeRules({ returns: { allowReturn: false } } as any), [], now);
    expect(e.items[0]).toMatchObject({ canReturn: false, canExchange: true });
  });
});

describe("small helpers", () => {
  it("trackingUrl prefers the courier link and falls back to Shiprocket's public page", () => {
    expect(trackingUrl({ number: "123", url: "https://courier.example/t/123" })).toBe("https://courier.example/t/123");
    expect(trackingUrl({ number: "ABC 1" })).toBe("https://shiprocket.co/tracking/ABC%201");
    expect(trackingUrl({ number: "" })).toBeNull();
    expect(trackingUrl({ number: "1", url: "javascript:alert(1)" })).toBe("https://shiprocket.co/tracking/1");
  });
  it("parseVideo understands YouTube, files and plain links", () => {
    expect(parseVideo("https://youtu.be/dQw4w9WgXcQ")).toEqual({ kind: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3")).toEqual({ kind: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseVideo("https://youtube.com/shorts/dQw4w9WgXcQ")).toEqual({ kind: "youtube", id: "dQw4w9WgXcQ" });
    expect(parseVideo("https://cdn.example.com/a.mp4")).toEqual({ kind: "file", src: "https://cdn.example.com/a.mp4" });
    expect(parseVideo("https://example.com/watch")).toEqual({ kind: "link", href: "https://example.com/watch" });
    expect(parseVideo("not a url")).toBeNull();
  });
});

describe("delivery date promise", () => {
  // 2026-10-21 is a Wednesday. Times below are IST.
  const ist = (iso: string) => Date.parse(iso + "+05:30");
  const label = (d: Date) => dayLabel(d);
  it("orders before the cut-off ship next working day, then transit working days are added", () => {
    const e = estimateDelivery("411001", DEFAULT_RULES, ist("2026-10-21T10:00:00")); // Wed 10am, cut-off 16:00, packing 1 day, transit 3–6
    expect(label(e.dispatch)).toBe("Thu, 22 Oct");
    expect(label(e.from)).toBe("Mon, 26 Oct"); // +3 working days from Thu 22: Fri 23, Sat 24, (Sunday skipped) Mon 26
    expect(label(e.to)).toBe("Thu, 29 Oct"); // +6 working days from Thu 22
  });
  it("orders after the cut-off start one day later", () => {
    const before = estimateDelivery("411001", DEFAULT_RULES, ist("2026-10-21T10:00:00"));
    const after = estimateDelivery("411001", DEFAULT_RULES, ist("2026-10-21T18:00:00"));
    expect(+after.to).toBeGreaterThan(+before.to);
    expect(label(after.dispatch)).toBe("Fri, 23 Oct");
  });
  it("Sundays are skipped when switched on, and counted when switched off", () => {
    const on = estimateDelivery("411001", DEFAULT_RULES, ist("2026-10-22T10:00:00"));
    const off = estimateDelivery("411001", mergeRules({ delivery: { sundayOff: false } } as any), ist("2026-10-22T10:00:00"));
    expect(+off.to).toBeLessThan(+on.to);
  });
  it("an order placed on a Sunday starts on Monday", () => {
    const e = estimateDelivery("411001", mergeRules({ delivery: { handlingDays: 0 } } as any), ist("2026-10-25T11:00:00")); // Sunday
    expect(label(e.dispatch)).toBe("Mon, 26 Oct");
  });
  it("area overrides use the longest matching pincode prefix", () => {
    const rules = mergeRules({ delivery: { overrides: [{ prefix: "11", min: 1, max: 2 }, { prefix: "1100", min: 1, max: 1 }] } } as any);
    const now = ist("2026-10-21T10:00:00");
    const delhi = estimateDelivery("110001", rules, now), other = estimateDelivery("560001", rules, now), cp = estimateDelivery("112233", rules, now);
    expect(+delhi.to).toBeLessThan(+other.to);
    expect(+delhi.to).toBeLessThanOrEqual(+cp.to);
  });
  it("same-day min/max shows a single date; otherwise a range", () => {
    const one = deliveryText(estimateDelivery("1", mergeRules({ delivery: { transitMin: 3, transitMax: 3 } } as any), ist("2026-10-21T10:00:00")));
    expect(one.range).toBe(one.by);
    const many = deliveryText(estimateDelivery("1", DEFAULT_RULES, ist("2026-10-21T10:00:00")));
    expect(many.range).toContain("–");
    expect(many.by).toMatch(/^[A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2}$/);
  });
});
