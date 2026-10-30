import mongoose, { Schema } from "mongoose";

/* Images are stored in MongoDB so the site works on any host (including Vercel,
   which has no writable disk) with zero extra accounts. Each image is resized and
   converted to WebP on upload. Move to Cloudinary/S3 later if the catalogue grows large. */
const ImageSchema = new Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, default: "image/webp" },
    size: Number,
  },
  { timestamps: true },
);

export const ImageModel = mongoose.models.Image || mongoose.model("Image", ImageSchema);
