import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { UserModel } from "@/models/User";
import type { CustomerUser } from "./types";

/* Customer sessions. A separate cookie from the admin one, so signing in as a customer never grants admin access. */
const COOKIE = "lc_user";
const MAX_AGE = 30 * 24 * 3600;

const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is missing or too short. Set a random string of 32+ characters in .env.local.");
  return new TextEncoder().encode(s);
};

export async function createUserSession(userId: string) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE });
}

export async function destroyUserSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in customer, or null. Re-checked against the database on every call. */
export async function getUserSession(): Promise<CustomerUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    await connectDB();
    const u = await UserModel.findById(String(payload.uid)).select("name email phone guest").lean();
    return u ? { id: String(u._id), name: u.name as string, email: u.email as string, phone: u.phone as string, guest: u.guest ? true : undefined } : null;
  } catch {
    return null;
  }
}

/** For server pages that need a signed-in customer: sends visitors to the home page with the login popup open. */
export async function requireUser(next: string): Promise<CustomerUser> {
  const user = await getUserSession();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect(`/?auth=login&next=${encodeURIComponent(next)}`);
  }
  return user as CustomerUser;
}
