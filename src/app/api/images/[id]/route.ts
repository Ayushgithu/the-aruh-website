import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ImageModel } from "@/models/Image";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return new Response("Not found", { status: 404 });
  await connectDB();
  const doc = await ImageModel.findById(id);
  if (!doc) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.contentType ?? "image/webp",
      // Image ids never change content, so browsers/CDNs can cache them for a year.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
