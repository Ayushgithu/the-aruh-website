/* Store rules the owner edits in Dashboard → Store rules. Pure helpers only (no database) so the browser can use them too. */

export interface SizeRow { size: string; minHeight: number; maxHeight: number; minWeight: number; maxWeight: number }

export interface StoreRules {
  shipping: { freeAbove: number; fee: number };
  cod: { enabled: boolean; max: number; advance: number; blockedPincodes: string[] };
  blockedPincodes: string[]; // no delivery at all
  guestCheckout: boolean;
  returns: { enabled: boolean; allowReturn: boolean; allowExchange: boolean; returnDays: number; exchangeDays: number; reasons: string[]; note: string };
  sizeAdvisor: { enabled: boolean; rows: SizeRow[] };
  saleTimer: { active: boolean; title: string; subtitle: string; cta: string; href: string; endsAt: string };
  shipment: { weightKg: number; lengthCm: number; breadthCm: number; heightCm: number };
  wallet: { enabled: boolean; bonusPercent: number }; // store credit; bonus % is added when a refund goes to the wallet
  delivery: { handlingDays: number; cutoffHour: number; transitMin: number; transitMax: number; sundayOff: boolean; overrides: { prefix: string; min: number; max: number }[] };
}

export const DEFAULT_RULES: StoreRules = {
  shipping: { freeAbove: 999, fee: 79 },
  cod: { enabled: true, max: 50000, advance: 0, blockedPincodes: [] },
  blockedPincodes: [],
  guestCheckout: true,
  returns: {
    enabled: true, allowReturn: true, allowExchange: true, returnDays: 7, exchangeDays: 7,
    reasons: ["Size is too small", "Size is too big", "Colour looks different", "Quality is not as expected", "Received a damaged item", "Received the wrong item", "Changed my mind"],
    note: "Items must be unworn, unwashed and have their tags intact.",
  },
  sizeAdvisor: {
    enabled: true,
    rows: [
      { size: "XS", minHeight: 145, maxHeight: 155, minWeight: 38, maxWeight: 48 },
      { size: "S", minHeight: 150, maxHeight: 160, minWeight: 46, maxWeight: 54 },
      { size: "M", minHeight: 155, maxHeight: 165, minWeight: 52, maxWeight: 60 },
      { size: "L", minHeight: 158, maxHeight: 168, minWeight: 58, maxWeight: 68 },
      { size: "XL", minHeight: 160, maxHeight: 170, minWeight: 66, maxWeight: 76 },
      { size: "XXL", minHeight: 162, maxHeight: 172, minWeight: 74, maxWeight: 84 },
      { size: "XXXL", minHeight: 163, maxHeight: 175, minWeight: 82, maxWeight: 95 },
    ],
  },
  saleTimer: { active: false, title: "Festive sale ends in", subtitle: "Up to 40% off on suit sets and sarees", cta: "Shop the sale", href: "/shop?sort=discount", endsAt: "" },
  shipment: { weightKg: 0.5, lengthCm: 25, breadthCm: 20, heightCm: 5 },
  wallet: { enabled: true, bonusPercent: 0 },
  delivery: { handlingDays: 1, cutoffHour: 16, transitMin: 3, transitMax: 6, sundayOff: true, overrides: [] },
};

type Deep<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? Deep<T[K]> : T[K] };

/** Fills anything missing with the defaults (so older saved settings keep working when new options are added). */
export function mergeRules(saved?: Deep<StoreRules> | null): StoreRules {
  const s = (saved ?? {}) as Deep<StoreRules>;
  const d = DEFAULT_RULES;
  return {
    shipping: { ...d.shipping, ...s.shipping },
    cod: { ...d.cod, ...s.cod, blockedPincodes: s.cod?.blockedPincodes ?? d.cod.blockedPincodes },
    blockedPincodes: s.blockedPincodes ?? d.blockedPincodes,
    guestCheckout: s.guestCheckout ?? d.guestCheckout,
    returns: { ...d.returns, ...s.returns, reasons: s.returns?.reasons?.length ? s.returns.reasons : d.returns.reasons },
    sizeAdvisor: { ...d.sizeAdvisor, ...s.sizeAdvisor, rows: s.sizeAdvisor?.rows?.length ? (s.sizeAdvisor.rows as SizeRow[]) : d.sizeAdvisor.rows },
    saleTimer: { ...d.saleTimer, ...s.saleTimer },
    shipment: { ...d.shipment, ...s.shipment },
    wallet: { ...d.wallet, ...s.wallet },
    delivery: { ...d.delivery, ...s.delivery, overrides: s.delivery?.overrides ?? d.delivery.overrides },
  };
}

/** A list entry is either a full 6-digit pincode or a prefix (e.g. "7940" blocks every pincode starting with it; a trailing * is allowed). */
export function pincodeListed(pin: string, list: string[]): boolean {
  const p = pin.trim();
  return list.some((raw) => {
    const e = raw.trim().replace(/\*$/, "");
    return e.length >= 1 && /^\d+$/.test(e) && p.startsWith(e);
  });
}

export type CodStatus = { ok: true } | { ok: false; reason: "disabled" | "limit" | "pincode" };
export function codStatus(total: number, pincode: string | undefined, rules: StoreRules): CodStatus {
  if (!rules.cod.enabled) return { ok: false, reason: "disabled" };
  if (total > rules.cod.max) return { ok: false, reason: "limit" };
  if (pincode && /^\d{6}$/.test(pincode) && pincodeListed(pincode, rules.cod.blockedPincodes)) return { ok: false, reason: "pincode" };
  return { ok: true };
}

export function computeTotals(lines: { price: number; quantity: number }[], rules: Pick<StoreRules, "shipping"> = DEFAULT_RULES) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const free = lines.length === 0 || subtotal >= rules.shipping.freeAbove;
  const shipping = free ? 0 : rules.shipping.fee;
  return { subtotal, shipping, total: subtotal + shipping };
}

/* ------------------------------------------------------------------ size advisor */
export type FitPref = "snug" | "regular" | "relaxed";
export interface SizeAdvice { size: string; inStock: boolean; note: string }

/** Picks the size whose height / weight ranges fit best (0 = inside both ranges). "relaxed" goes one size up. Only sizes in `available` are suggested. */
export function recommendSize(heightCm: number, weightKg: number, rows: SizeRow[], pref: FitPref = "regular", available?: { label: string; qty: number }[]): SizeAdvice | null {
  if (!rows.length || !(heightCm > 0) || !(weightKg > 0)) return null;
  const gap = (v: number, lo: number, hi: number) => (v < lo ? lo - v : v > hi ? v - hi : 0);
  // weight matters more than height for fit, so it is weighted 2x
  const scored = rows.map((r, i) => ({ r, i, score: gap(heightCm, r.minHeight, r.maxHeight) + 2 * gap(weightKg, r.minWeight, r.maxWeight) }));
  const best = scored.reduce((a, b) => (b.score < a.score || (b.score === a.score && b.i > a.i) ? b : a)); // ties → larger size
  let idx = Math.min(rows.length - 1, best.i + (pref === "relaxed" ? 1 : 0));
  if (pref === "snug" && best.score === 0 && weightKg <= rows[best.i].minWeight + 1 && best.i > 0) idx = best.i - 1;
  const want = rows[idx].size;
  if (!available?.length) return { size: want, inStock: true, note: pref === "relaxed" ? "one size up for a relaxed fit" : "best match for your height and weight" };
  const order = rows.map((r) => r.size);
  const stocked = (label: string) => (available.find((a) => a.label === label)?.qty ?? 0) > 0;
  if (stocked(want)) return { size: want, inStock: true, note: pref === "relaxed" ? "one size up for a relaxed fit" : "best match for your height and weight" };
  // nearest stocked size, preferring the larger one
  const cand = available.filter((a) => a.qty > 0 && order.includes(a.label)).map((a) => ({ label: a.label, d: order.indexOf(a.label) - idx }));
  if (!cand.length) return { size: want, inStock: false, note: "your size is currently sold out" };
  cand.sort((a, b) => Math.abs(a.d) - Math.abs(b.d) || b.d - a.d);
  return { size: cand[0].label, inStock: true, note: `${want} is sold out, ${cand[0].label} is the closest available` };
}

/* ------------------------------------------------------------------ delivery date promise */
const IST_MS = 5.5 * 3600_000;
const DAY_MS = 86_400_000;
const addWorking = (ms: number, n: number, sundayOff: boolean) => { let t = ms; for (let left = n; left > 0; ) { t += DAY_MS; if (!(sundayOff && new Date(t).getUTCDay() === 0)) left--; } return t; };

export interface DeliveryEstimate { from: Date; to: Date; dispatch: Date }
/** "Get it by …": orders after the cut-off hour (IST) start the next working day; transit days count working days (Sundays skipped when switched on). */
export function estimateDelivery(pincode: string | undefined, rules: Pick<StoreRules, "delivery">, now = Date.now()): DeliveryEstimate {
  const d = rules.delivery;
  const ov = pincode ? [...d.overrides].filter((o) => o.prefix && pincode.startsWith(o.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0] : undefined;
  const min = ov?.min ?? d.transitMin;
  const max = Math.max(min, ov?.max ?? d.transitMax);
  let base = now + IST_MS; // IST wall-clock, expressed in UTC fields
  if (new Date(base).getUTCHours() >= d.cutoffHour) base += DAY_MS;
  while (d.sundayOff && new Date(base).getUTCDay() === 0) base += DAY_MS;
  const dispatch = addWorking(base, d.handlingDays, d.sundayOff);
  const out = (ms: number) => new Date(ms - IST_MS);
  return { dispatch: out(dispatch), from: out(addWorking(dispatch, min, d.sundayOff)), to: out(addWorking(dispatch, max, d.sundayOff)) };
}

/** "Fri, 24 Oct" */
export const dayLabel = (d: Date | string) => new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(d));
export function deliveryText(e: DeliveryEstimate) {
  const by = dayLabel(e.to);
  const a = dayLabel(e.from);
  return { by, range: a === by ? by : `${a} – ${by}` };
}
