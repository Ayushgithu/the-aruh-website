import { DEFAULT_RULES, codStatus, computeTotals as compute, type StoreRules } from "./rules";

/* Defaults. The real values come from Dashboard → Store rules (see rules.ts). */
export const FREE_SHIPPING_ABOVE = DEFAULT_RULES.shipping.freeAbove;
export const SHIPPING_FEE = DEFAULT_RULES.shipping.fee;
export const COD_MAX = DEFAULT_RULES.cod.max;

interface Line { price: number; quantity: number; type?: "clothing" | "accessory" | "laptop" }

export const computeTotals = (lines: Line[], rules: Pick<StoreRules, "shipping"> = DEFAULT_RULES) => compute(lines, rules);
export const codAvailable = (total: number, rules: StoreRules = DEFAULT_RULES, pincode?: string) => codStatus(total, pincode, rules).ok;
