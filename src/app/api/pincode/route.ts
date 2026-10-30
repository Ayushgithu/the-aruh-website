import { fail, ok, publicRoute } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getRules } from "@/lib/settings";
import { codStatus, deliveryText, estimateDelivery, pincodeListed } from "@/lib/rules";

/** Delivery estimate for a pincode. Honours the owner's blocked-pincode lists (Dashboard → Store rules). */
export const GET = publicRoute(async (req) => {
  if (!rateLimit(`pin:${clientIp(req)}`, 60, 10 * 60_000)) return fail("Too many checks. Please wait a few minutes.", 429);
  const pin = new URL(req.url).searchParams.get("pin") ?? "";
  if (!/^[1-9]\d{5}$/.test(pin)) return fail("Enter a valid 6-digit pincode", 400);
  const rules = await getRules();
  if (pincodeListed(pin, rules.blockedPincodes)) return ok({ deliverable: false, pin });
  const text = deliveryText(estimateDelivery(pin, rules)); // working days set in Dashboard → Store rules → Delivery time
  return ok({ deliverable: true, pin, by: text.by, range: text.range, cod: codStatus(0, pin, rules).ok });
});
