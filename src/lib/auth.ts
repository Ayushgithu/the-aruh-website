import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectDB } from "./db";
import { AdminModel } from "@/models/Admin";

const COOKIE = "lc_admin";
const MAX_AGE = 7 * 24 * 3600;

export interface Session { id: string; email: string; name: string }

const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is missing or too short. Set a random string of 32+ characters in .env.local.");
  return new TextEncoder().encode(s);
};

export async function createSession(s: Session) {
  const token = await new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Returns the signed-in admin, or null. Also checks the admin still exists (so removed admins lose access immediately). */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const id = String(payload.id);
    await connectDB();
    const admin = await AdminModel.findById(id).select("name email").lean();
    if (!admin) return null;
    return { id, email: admin.email as string, name: admin.name as string };
  } catch {
    return null;
  }
}
