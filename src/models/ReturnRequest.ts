import mongoose, { Schema } from "mongoose";

const ItemSchema = new Schema(
  { index: Number, product: { type: Schema.Types.ObjectId, ref: "Product" }, slug: String, name: String, size: String, color: String, price: Number, quantity: Number, image: String, art: Schema.Types.Mixed },
  { _id: false },
);

const ReturnSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: String,
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customer: new Schema({ name: String, email: String, phone: String }, { _id: false }),
    type: { type: String, enum: ["return", "exchange"], required: true },
    items: [ItemSchema],
    reason: { type: String, required: true },
    comment: String,
    photos: [String],
    exchangeTo: new Schema({ size: String, color: String }, { _id: false }),
    status: { type: String, enum: ["requested", "approved", "rejected", "pickup_scheduled", "received", "refunded", "exchange_shipped", "cancelled"], default: "requested", index: true },
    pickup: new Schema({ carrier: String, awb: String, url: String, shiprocketOrderId: String, shipmentId: String }, { _id: false }),
    refundTo: { type: String, enum: ["original", "wallet"], default: "original" },
    refundDetails: String,
    refund: new Schema({ amount: Number, bonus: Number, method: { type: String, enum: ["razorpay", "manual", "wallet"] }, refundId: String, note: String, at: Date }, { _id: false }),
    exchangeShipment: new Schema({ carrier: String, awb: String, url: String }, { _id: false }),
    restocked: { type: Boolean, default: false },
    adminNote: String,
    timeline: [new Schema({ status: String, at: { type: Date, default: Date.now }, note: String, by: String }, { _id: false })],
  },
  { timestamps: true },
);

export const ReturnModel = mongoose.models.ReturnRequest || mongoose.model("ReturnRequest", ReturnSchema);
