import mongoose, { Schema } from "mongoose";

const PushSubSchema = new Schema(
  { endpoint: { type: String, required: true, unique: true }, keys: new Schema({ p256dh: String, auth: String }, { _id: false }), user: { type: Schema.Types.ObjectId, ref: "User" }, ua: String },
  { timestamps: true },
);

export const PushSubModel = mongoose.models.PushSub || mongoose.model("PushSub", PushSubSchema);
