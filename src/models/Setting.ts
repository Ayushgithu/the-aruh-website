import mongoose, { Schema } from "mongoose";

/** One document per key (we only use key "store"). `data` holds the owner's store rules. */
const SettingSchema = new Schema({ key: { type: String, required: true, unique: true }, data: { type: Schema.Types.Mixed, default: {} } }, { timestamps: true });

export const SettingModel = mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
