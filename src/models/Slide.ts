import mongoose, { Schema } from "mongoose";

/** Full-width image slide in the carousel under the hero (printerpartspoint-style). */
const SlideSchema = new Schema(
  {
    title: { type: String, required: true }, // internal name + image alt text
    href: { type: String, default: "" },
    image: { type: String, required: true }, // wide desktop artwork
    mobileImage: String, // optional 4:3 artwork for phones
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

export const SlideModel = mongoose.models.Slide || mongoose.model("Slide", SlideSchema);
