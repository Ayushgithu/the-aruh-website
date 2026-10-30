import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { customerLoginSchema } from "@/lib/validation";
import { fail, ok, publicRoute, readJson } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createUserSession, getUserSession } from "@/lib/user-auth";
import { mergeGuestCart } from "@/lib/cart";
import { sendVerificationEmail } from "@/lib/email";
import { issueOtp } from "@/lib/tokens";

// Compared against when the email is unknown, so response time does not reveal which emails have accounts.
const DUMMY_HASH = "$2b$10$w7vnoCrY1s1keBkN..lAO.OzaYFfS71BqiXKJLppf1zlo89JlVmH.";

export const POST = publicRoute(async (req) => {
  const parsed = customerLoginSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail("Enter your email and password.", 400);
  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`ulogin:${clientIp(req)}:${email}`, 8, 15 * 60_000)) return fail("Too many attempts. Please wait 15 minutes and try again.", 429);

  await connectDB();
  const user = await UserModel.findOne({ email });
  const good = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !good) return fail("Incorrect email or password.", 401);

  // Signed up by email but never entered the code: send a fresh one and let the popup show the code screen.
  if (user.emailVerified === false) {
    const { code, fields } = issueOtp(user.email);
    Object.assign(user, fields);
    await user.save();
    try { await sendVerificationEmail({ to: user.email, name: user.name, code }); }
    catch (e) { console.error("[login] verification email failed:", e instanceof Error ? e.message : e); }
    return Response.json({ error: "Please verify your email first. We sent you a new code.", needsVerification: true, email: user.email }, { status: 403 });
  }

  let before = null;
  try { before = await getUserSession(); } catch { /* not signed in */ }
  if (before?.guest) await mergeGuestCart(before.id, String(user._id)).catch(() => {}); // keep what they already added to the bag
  await createUserSession(String(user._id));
  return ok({ user: { id: String(user._id), name: user.name, email: user.email, phone: user.phone } });
});
