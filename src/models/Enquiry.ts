import mongoose, { Schema } from "mongoose";

const EnquirySchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    source: { type: String, enum: ["Contact form", "Product enquiry", "Sell request", "WhatsApp"], required: true },
    message: { type: String, default: "" },
    products: { type: [String], default: [] }, // product names at the time of enquiry
    sell: {
      type: new Schema(
        { brand: String, model: String, condition: String, expectedPrice: Number, city: String, photos: [String] },
        { _id: false },
      ),
      default: undefined,
    },
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new", index: true },
  },
  { timestamps: true },
);

export const EnquiryModel = mongoose.models.Enquiry || mongoose.model("Enquiry", EnquirySchema);
