import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { googleSchema } from "@/lib/validation";
import { fail, ok, publicRoute, readJson } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createUserSession } from "@/lib/user-auth";

const certs = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const randomHash = () => bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10); // Google accounts get an unguessable password

/**
 * "Continue with Google". The browser sends the ID token Google signed; we verify its signature, audience (our client id)
 * and expiry here, so nothing the browser says about who the user is is trusted.
 */
export const POST = publicRoute(async (req) => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return fail("Google sign-in is not set up on this site yet.", 503);
  if (!rateLimit(`google:${clientIp(req)}`, 20, 15 * 60_000)) return fail("Too many attempts. Please try again in a few minutes.", 429);
  const { credential } = googleSchema.parse(await readJson(req));

  let claims: JWTPayload;
  try {
    ({ payload: claims } = await jwtVerify(credential, certs, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: clientId }));
  } catch {
    return fail("Google sign-in could not be verified. Please try again.", 401);
  }
  const sub = String(claims.sub ?? "");
  const email = String(claims.email ?? "").toLowerCase();
  if (!sub || !email || claims.email_verified !== true) return fail("Your Google email address is not verified.", 401);
  const name = String(claims.name ?? "").trim() || email.split("@")[0];

  await connectDB();
  let user = (await UserModel.findOne({ googleId: sub })) ?? (await UserModel.findOne({ email }));
  if (user) {
    if (user.googleId && user.googleId !== sub) return fail("This email is linked to a different Google account.", 409);
    let dirty = false;
    if (!user.googleId) { user.googleId = sub; dirty = true; }
    if (user.emailVerified === false) {
      // Google just proved this inbox is theirs, so a never-verified sign-up (possibly typed in by someone else) is replaced.
      user.emailVerified = true;
      user.passwordHash = await randomHash();
      user.otpHash = undefined; user.otpExpires = undefined; user.otpAttempts = undefined;
      dirty = true;
    }
    if (dirty) await user.save();
  } else {
    user = await UserModel.create({ name, email, googleId: sub, emailVerified: true, phone: "", passwordHash: await randomHash() });
  }

  await createUserSession(String(user._id));
  return ok({ user: { id: String(user._id), name: user.name, email: user.email, phone: user.phone ?? "" }, needsPhone: !user.phone });
});
