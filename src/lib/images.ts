import sharp from "sharp";
import { connectDB } from "./db";
import { ImageModel } from "@/models/Image";
import { HttpError } from "./api-helpers";

const MAX_BYTES = 8 * 1024 * 1024;
const URL_RE = /^\/api\/images\/([a-f0-9]{24})$/;

/** Validates, resizes (max 1600px) and stores an image in MongoDB. Returns its public URL. */
export async function saveImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new HttpError("Each photo must be smaller than 8 MB.", 413);
  const input = Buffer.from(await file.arrayBuffer());
  let out: Buffer;
  try {
    out = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch {
    throw new HttpError(`"${file.name}" is not a valid image.`, 400);
  }
  await connectDB();
  const doc = await ImageModel.create({ data: out, contentType: "image/webp", size: out.length });
  return `/api/images/${doc._id}`;
}

export async function deleteImages(urls: (string | undefined | null)[]) {
  const ids = urls.map((u) => (u ? URL_RE.exec(u)?.[1] : undefined)).filter(Boolean) as string[];
  if (!ids.length) return;
  await connectDB();
  await ImageModel.deleteMany({ _id: { $in: ids } });
}
