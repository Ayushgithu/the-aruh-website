import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true }, // empty for Google sign-ups until they add one
    passwordHash: { type: String, required: true },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    lastAddress: {
      type: new Schema({ name: String, phone: String, line1: String, line2: String, city: String, state: String, pincode: String }, { _id: false }),
      default: undefined,
    },
    walletBalance: { type: Number, default: 0, min: 0 }, // store credit in rupees
    guest: { type: Boolean, default: false }, // a throw-away account created for "continue as guest"
    shareToken: { type: String, index: { unique: true, sparse: true } }, // public wishlist link
    addresses: [new Schema({ label: { type: String, default: "Home" }, name: String, phone: String, line1: String, line2: String, city: String, state: String, pincode: String, isDefault: Boolean }, { timestamps: false })],
    googleId: { type: String, index: { unique: true, sparse: true } },
    // Legacy accounts have no value, which counts as verified. Only new email sign-ups start unverified.
    emailVerified: { type: Boolean, default: true },
    otpHash: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpAttempts: { type: Number, select: false },
    otpSentAt: { type: Date, select: false },
    resetTokenHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
