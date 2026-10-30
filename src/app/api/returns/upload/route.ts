import { HttpError, ok, userRoute } from "@/lib/api-helpers";
import { saveImage } from "@/lib/images";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Photos for a return request (damaged / wrong item). Signed-in customers only, small batches. */
export const POST = userRoute(async (req, _ctx, user) => {
  if (!rateLimit(`retup:${user.id}:${clientIp(req)}`, 12, 60 * 60_000)) throw new HttpError("Too many uploads. Please try again later.", 429);
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) throw new HttpError("Choose a photo to upload.", 400);
  if (files.length > 4) throw new HttpError("You can upload up to 4 photos.", 400);
  const urls: string[] = [];
  for (const f of files) urls.push(await saveImage(f));
  return ok({ urls }, 201);
});
