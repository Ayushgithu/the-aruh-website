import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { verifyEmailSchema } from "@/lib/validation";
import { fail, ok, publicRoute, readJson } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createUserSession } from "@/lib/user-auth";
import { OTP_MAX_ATTEMPTS, otpDigest, safeEqual } from "@/lib/tokens";

export const POST = publicRoute(async (req) => {
  const parsed = verifyEmailSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter the 6-digit code.", 400);
  const { email, code } = parsed.data;
  if (!rateLimit(`verify-ip:${clientIp(req)}`, 20, 15 * 60_000)) return fail("Too many attempts. Please wait a few minutes and try again.", 429);

  await connectDB();
  const user = await UserModel.findOne({ email }).select("+otpHash +otpExpires +otpAttempts");
  const BAD = "That code is not correct. Check the email and try again.";
  if (!user || !user.otpHash || !user.otpExpires) return fail(BAD, 400);
  if (user.otpExpires.getTime() < Date.now()) return fail("This code has expired. Tap “Resend code” to get a new one.", 400);
  if ((user.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) return fail("Too many wrong attempts. Tap “Resend code” to get a new one.", 429);

  if (!safeEqual(otpDigest(email, code), user.otpHash)) {
    user.otpAttempts = (user.otpAttempts ?? 0) + 1;
    await user.save();
    return fail(BAD, 400);
  }

  user.emailVerified = true;
  user.otpHash = undefined; // single use
  user.otpExpires = undefined;
  user.otpAttempts = undefined;
  await user.save();
  await createUserSession(String(user._id));
  return ok({ user: { id: String(user._id), name: user.name, email: user.email, phone: user.phone } });
});
