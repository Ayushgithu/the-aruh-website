import mongoose, { Schema } from "mongoose";

const BrandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: String,
    href: { type: String, default: "" }, // empty = /laptops?brand=<name>
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

export const BrandModel = mongoose.models.Brand || mongoose.model("Brand", BrandSchema);
