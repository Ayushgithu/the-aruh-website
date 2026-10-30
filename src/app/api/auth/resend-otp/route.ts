import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { forgotSchema } from "@/lib/validation";
import { fail, ok, publicRoute, readJson } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import { OTP_RESEND_COOLDOWN_MS, issueOtp } from "@/lib/tokens";

export const POST = publicRoute(async (req) => {
  const parsed = forgotSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter a valid email address.", 400);
  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`otp-ip:${clientIp(req)}`, 8, 15 * 60_000) || !rateLimit(`otp-email:${email}`, 4, 15 * 60_000)) {
    return fail("Too many requests. Please try again in a few minutes.", 429);
  }

  await connectDB();
  const user = await UserModel.findOne({ email }).select("+otpSentAt");
  // Same answer whether or not the address has a pending sign-up.
  if (user && user.emailVerified === false && (!user.otpSentAt || Date.now() - user.otpSentAt.getTime() >= OTP_RESEND_COOLDOWN_MS)) {
    const { code, fields } = issueOtp(email);
    Object.assign(user, fields);
    await user.save();
    try { await sendVerificationEmail({ to: user.email, name: user.name, code }); }
    catch (e) { console.error("[resend-otp] email failed:", e instanceof Error ? e.message : e); return fail("We could not send the email. Please try again in a minute.", 502); }
  }
  return ok({ ok: true });
});
