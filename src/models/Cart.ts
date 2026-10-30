import mongoose, { Schema } from "mongoose";

/* One cart per customer. The admin dashboard reads these to show "who added what". */
const CartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [
      new Schema(
        {
          product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
          size: String,
          color: String,
          quantity: { type: Number, required: true, min: 1 },
          addedAt: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
    ],
  },
  { timestamps: true },
);

export const CartModel = mongoose.models.Cart || mongoose.model("Cart", CartSchema);
