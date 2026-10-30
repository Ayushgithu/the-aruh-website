import { after } from "next/server";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { forgotSchema } from "@/lib/validation";
import { fail, ok, publicRoute, readJson } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendCustomerResetEmail } from "@/lib/email";
import { newResetToken, sha256 } from "@/lib/tokens";

/** Base URL for the emailed link. Never taken from request headers in production (prevents reset-link poisoning). */
function baseUrl(req: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return new URL(req.url).origin;
  return null;
}

export const POST = publicRoute(async (req) => {
  const parsed = forgotSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter a valid email address.", 400);
  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`uforgot-ip:${clientIp(req)}`, 5, 15 * 60_000) || !rateLimit(`uforgot-email:${email}`, 3, 15 * 60_000)) {
    return fail("Too many requests. Please try again in a few minutes.", 429);
  }

  await connectDB();
  const user = await UserModel.findOne({ email });
  if (user) {
    const token = newResetToken();
    user.resetTokenHash = sha256(token);
    user.resetExpires = new Date(Date.now() + 60 * 60_000);
    await user.save();
    const base = baseUrl(req);
    if (!base) console.error("[forgot-password] NEXT_PUBLIC_SITE_URL is not set; cannot build the reset link.");
    else {
      const link = `${base}/?auth=reset&token=${token}&email=${encodeURIComponent(email)}`;
      after(async () => {
        try { await sendCustomerResetEmail({ to: user.email, name: user.name, link }); }
        catch (e) { console.error("[forgot-password] email failed:", e instanceof Error ? e.message : e); }
      });
    }
  }
  return ok({ ok: true }); // identical answer whether or not the email has an account
});
