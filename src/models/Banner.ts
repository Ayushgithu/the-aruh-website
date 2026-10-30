import mongoose, { Schema } from "mongoose";

const BannerSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    cta: { type: String, default: "Shop now" },
    href: { type: String, default: "/laptops" },
    theme: { type: String, enum: ["blue", "slate", "sky"], default: "blue" },
    image: String,
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const BannerModel = mongoose.models.Banner || mongoose.model("Banner", BannerSchema);
