import mongoose, { Schema } from "mongoose";

/** Every change to a customer's store credit. `amount` is positive for credit, negative for spending. */
const WalletTxnSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    type: { type: String, enum: ["refund", "bonus", "order", "order_cancelled", "adjustment"], required: true },
    note: String,
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    returnRequest: { type: Schema.Types.ObjectId, ref: "ReturnRequest" },
    by: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const WalletTxnModel = mongoose.models.WalletTxn || mongoose.model("WalletTxn", WalletTxnSchema);
