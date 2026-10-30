import { connectDB } from "./db";
import { UserModel } from "@/models/User";
import { WalletTxnModel } from "@/models/WalletTxn";
import type { WalletTxn } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Meta = { type: WalletTxn["type"]; note?: string; order?: string; returnRequest?: string; by?: string };

/** Adds store credit. Returns the new balance. */
export async function creditWallet(userId: string, amount: number, meta: Meta): Promise<number> {
  if (!(amount > 0)) throw new Error("Credit must be more than zero.");
  await connectDB();
  const u: any = await UserModel.findOneAndUpdate({ _id: userId }, { $inc: { walletBalance: amount } }, { new: true }).select("walletBalance").lean();
  if (!u) throw new Error("Customer not found.");
  await WalletTxnModel.create({ user: userId, amount, balanceAfter: u.walletBalance, ...meta });
  return u.walletBalance;
}

/** Takes store credit — atomically, so two checkouts at once can never spend the same money twice. Returns false when the balance is too low. */
export async function debitWallet(userId: string, amount: number, meta: Meta): Promise<boolean> {
  if (!(amount > 0)) return true;
  await connectDB();
  const u: any = await UserModel.findOneAndUpdate({ _id: userId, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } }, { new: true }).select("walletBalance").lean();
  if (!u) return false;
  await WalletTxnModel.create({ user: userId, amount: -amount, balanceAfter: u.walletBalance, ...meta });
  return true;
}

export async function getWallet(userId: string, limit = 50): Promise<{ balance: number; txns: WalletTxn[] }> {
  await connectDB();
  const [u, txns] = await Promise.all([UserModel.findById(userId).select("walletBalance").lean(), WalletTxnModel.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean()]);
  return {
    balance: Math.max(0, (u as any)?.walletBalance ?? 0),
    txns: (txns as any[]).map((t) => ({ id: String(t._id), amount: t.amount, balanceAfter: t.balanceAfter, type: t.type, note: t.note || undefined, createdAt: new Date(t.createdAt).toISOString() })),
  };
}
