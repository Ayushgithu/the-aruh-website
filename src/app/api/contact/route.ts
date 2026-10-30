import { connectDB } from "@/lib/db";
import { EnquiryModel } from "@/models/Enquiry";
import { contactSchema } from "@/lib/validation";
import { fail, ok, publicRoute, readJson } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const POST = publicRoute(async (req) => {
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60_000)) return fail("Too many messages. Please wait a few minutes or WhatsApp us.", 429);
  const v = contactSchema.parse(await readJson(req));
  await connectDB();
  await EnquiryModel.create({ name: v.name, phone: v.phone, message: v.message, source: "Contact form" });
  return ok({ ok: true }, 201);
});
