import { connectDB } from "./db";
import { SettingModel } from "@/models/Setting";
import { mergeRules, type StoreRules } from "./rules";

/* eslint-disable @typescript-eslint/no-explicit-any */
let cache: { at: number; rules: StoreRules } | null = null;
const TTL = 15_000;

/** The owner's store rules (cached for a few seconds). Never throws: if the database is unreachable the defaults are used. */
export async function getRules(force = false): Promise<StoreRules> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.rules;
  try {
    await connectDB();
    const doc: any = await SettingModel.findOne({ key: "store" }).lean();
    cache = { at: Date.now(), rules: mergeRules(doc?.data) };
  } catch {
    cache = { at: Date.now() - TTL + 3000, rules: cache?.rules ?? mergeRules(null) };
  }
  return cache.rules;
}

export async function saveRules(rules: StoreRules): Promise<StoreRules> {
  await connectDB();
  await SettingModel.updateOne({ key: "store" }, { $set: { data: rules } }, { upsert: true });
  cache = { at: Date.now(), rules };
  return rules;
}

export const resetRulesCache = () => { cache = null; };
