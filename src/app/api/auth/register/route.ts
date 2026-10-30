import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { normalizePhone, registerSchema } from "@/lib/validation";
import { HttpError, fail, ok, publicRoute, readJson } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import { issueOtp } from "@/lib/tokens";

/** Creates the account as "unverified" and emails a 6-digit code. The customer is signed in only after /api/auth/verify-email. */
export const POST = publicRoute(async (req) => {
  if (!rateLimit(`register:${clientIp(req)}`, 8, 60 * 60_000)) return fail("Too many sign-ups from this device. Please try again later.", 429);
  const v = registerSchema.parse(await readJson(req));
  if (!rateLimit(`register-email:${v.email}`, 4, 60 * 60_000)) return fail("Too many attempts for this email. Please try again later.", 429);
  await connectDB();

  const existing = await UserModel.findOne({ email: v.email });
  if (existing && existing.emailVerified !== false) return fail("An account with this email already exists. Try signing in instead.", 409);

  const { code, fields } = issueOtp(v.email);
  const details = { name: v.name, phone: normalizePhone(v.phone), passwordHash: await bcrypt.hash(v.password, 10) };
  if (existing) {
    // A half-finished sign-up (never verified) is simply restarted, so nobody can lock an address by typing it in.
    Object.assign(existing, details, fields);
    await existing.save();
  } else {
    await UserModel.create({ ...details, email: v.email, emailVerified: false, ...fields });
  }

  try { await sendVerificationEmail({ to: v.email, name: v.name, code }); }
  catch (e) {
    console.error("[register] verification email failed:", e instanceof Error ? e.message : e);
    throw new HttpError("We could not send the verification email. Please try again in a minute.", 502);
  }
  return ok({ needsVerification: true, email: v.email }, 201);
});
