import mongoose, { Schema } from "mongoose";

const ItemSchema = new Schema(
  { product: { type: Schema.Types.ObjectId, ref: "Product" }, slug: String, name: String, brand: String, size: String, color: String, price: Number, quantity: Number, image: String, art: Schema.Types.Mixed, returnable: { type: Boolean, default: true }, exchangeable: { type: Boolean, default: true } },
  { _id: false },
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customer: new Schema({ name: String, email: String, phone: String }, { _id: false }),
    items: [ItemSchema],
    subtotal: Number,
    shipping: Number,
    total: { type: Number, required: true },
    address: new Schema({ name: String, phone: String, line1: String, line2: String, city: String, state: String, pincode: String }, { _id: false }),
    payment: new Schema(
      {
        method: { type: String, enum: ["razorpay", "cod", "wallet"], required: true },
        status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
        razorpayOrderId: { type: String, index: true },
        razorpayPaymentId: String,
        paidAt: Date,
        refundId: String,
        advance: new Schema({ amount: Number, status: { type: String, enum: ["pending", "paid", "refunded"], default: "pending" }, razorpayPaymentId: String, paidAt: Date, refundId: String }, { _id: false }),
      },
      { _id: false },
    ),
    status: { type: String, enum: ["pending_payment", "placed", "confirmed", "shipped", "delivered", "cancelled"], default: "placed", index: true },
    tracking: new Schema({ carrier: String, number: String, url: String, labelUrl: String, shiprocketOrderId: String, shipmentId: String }, { _id: false }),
    trackingEvents: [new Schema({ status: String, at: Date, location: String, note: String }, { _id: false })],
    deliveredAt: Date,
    walletUsed: { type: Number, default: 0 },
    walletRefunded: { type: Boolean, default: false },
    expectedBy: Date,
    timeline: [new Schema({ status: String, at: { type: Date, default: Date.now }, note: String }, { _id: false })],
    expiresAt: Date, // unpaid online orders release their reserved stock after this time
    stockReleased: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const OrderModel = mongoose.models.Order || mongoose.model("Order", OrderSchema);
