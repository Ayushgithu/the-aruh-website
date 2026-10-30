import mongoose, { Schema } from "mongoose";

/* Messages shown in the scrolling bar at the very top of the website. */
const AnnouncementSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    href: String,
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const AnnouncementModel = mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);
