import crypto from "node:crypto";
import { connectDB } from "@/lib/db";
import { UserModel } from "@/models/User";
import { fail, ok, publicRoute } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createUserSession, getUserSession } from "@/lib/user-auth";
import { getRules } from "@/lib/settings";

/** "Continue as guest": creates a throw-away account (no password, no real email) and signs the browser in, so the cart and checkout work. */
export const POST = publicRoute(async (req) => {
  if (!(await getRules()).guestCheckout) return fail("Guest checkout is turned off. Please sign in or create an account.", 403);
  const existing = await getUserSession();
  if (existing) return ok({ user: existing });
  if (!rateLimit(`guest:${clientIp(req)}`, 30, 60 * 60_000)) return fail("Too many requests from this device. Please try again later.", 429);
  await connectDB();
  const tag = crypto.randomBytes(8).toString("hex");
  const u = await UserModel.create({
    name: "Guest", email: `guest-${tag}@guest.invalid`, phone: "", guest: true, emailVerified: true,
    passwordHash: crypto.randomBytes(32).toString("hex"), // not a bcrypt hash, so nobody can ever sign in to it with a password
  });
  await createUserSession(String(u._id));
  return ok({ user: { id: String(u._id), name: "Guest", email: u.email, phone: "", guest: true } }, 201);
});
