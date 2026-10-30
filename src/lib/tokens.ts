import crypto from "node:crypto";

/** Password-reset tokens are random; only their SHA-256 hash is stored in the database. */
export const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
export const newResetToken = () => crypto.randomBytes(32).toString("hex");

/* ---------------------------- Email verification codes ---------------------------- */
export const OTP_TTL_MS = 10 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30_000;

/** 6-digit code from a CSPRNG. */
export const newOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

/** Only this keyed hash is stored, so a database leak does not reveal usable codes. */
export function otpDigest(email: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET is missing or too short.");
  return crypto.createHmac("sha256", secret).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Fresh code + the fields to store on the user document. */
export function issueOtp(email: string) {
  const code = newOtp();
  return { code, fields: { otpHash: otpDigest(email, code), otpExpires: new Date(Date.now() + OTP_TTL_MS), otpAttempts: 0, otpSentAt: new Date() } };
}
