import mongoose, { Schema } from "mongoose";

const AdminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Forgot-password: only a SHA-256 hash of the emailed token is stored; it expires and works once.
    resetTokenHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export const AdminModel = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);
