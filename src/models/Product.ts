import mongoose, { Schema } from "mongoose";

const ProductSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["clothing", "accessory", "laptop"], required: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: "", index: true },
    category: { type: String, required: true, index: true },
    tags: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0, index: true },
    mrp: Number,
    condition: { type: String, enum: ["A", "B", "C", "New"], default: "New" },
    stock: { type: String, enum: ["in-stock", "low", "out"], default: "in-stock" },
    stockCount: Number,
    quantity: { type: Number, min: 0 }, // units on hand; stock status is derived from this
    specs: { type: Schema.Types.Mixed, default: {} }, // ordered { label: value }
    highlights: { type: [String], default: [] },
    ramGb: Number,
    cpu: String,
    screenIn: Number,
    included: { type: [String], default: [] },
    conditionNotes: { type: [String], default: [] },
    description: { type: String, default: "" },
    warranty: { type: String, default: "" },
    images: { type: [String], default: [] }, // /api/images/<id> URLs
    art: { type: Schema.Types.Mixed }, // vector placeholder shown when no photos
    sizes: { type: [new Schema({ label: { type: String, required: true }, qty: { type: Number, default: 0, min: 0 } }, { _id: false })], default: [] },
    colors: { type: [new Schema({ name: { type: String, required: true }, hex: String, images: { type: [String], default: [] } }, { _id: false })], default: [] },
    videoUrl: { type: String, default: "" },
    flashPrice: Number,
    flashEndsAt: Date,
    returnable: { type: Boolean, default: true },
    exchangeable: { type: Boolean, default: true },
    fabric: { type: String, default: "" },
    washCare: { type: String, default: "" },
    fit: { type: String, default: "" },
    occasion: { type: String, default: "" },
    badges: { type: [String], default: [] },
    featured: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false },
);

export const ProductModel = mongoose.models.Product || mongoose.model("Product", ProductSchema);
