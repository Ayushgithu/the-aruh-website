// @vitest-environment node
import bcrypt from "bcryptjs";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
const pending = vi.hoisted(() => [] as Promise<unknown>[]);
vi.mock("next/server", () => ({ after: (fn: () => unknown) => { pending.push(Promise.resolve().then(fn)); } }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/user-auth", () => ({ createUserSession: vi.fn(), destroyUserSession: vi.fn(), getUserSession: vi.fn() }));
vi.mock("@/lib/repo-shop", () => ({ getCartLines: vi.fn(async () => [{ productId: "p1", quantity: 2 }]) }));
vi.mock("@/lib/email", () => ({ sendCustomerResetEmail: vi.fn(async () => true), sendVerificationEmail: vi.fn(async () => true) }));
vi.mock("@/models/User", () => ({ UserModel: { create: vi.fn(), exists: vi.fn(), findOne: vi.fn(), findById: vi.fn(), updateOne: vi.fn() } }));

import { createUserSession, destroyUserSession, getUserSession } from "@/lib/user-auth";
import { sendCustomerResetEmail, sendVerificationEmail } from "@/lib/email";
import { otpDigest, sha256 } from "@/lib/tokens";
import { UserModel } from "@/models/User";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as verifyEmail } from "@/app/api/auth/verify-email/route";
import { POST as resendOtp } from "@/app/api/auth/resend-otp/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { POST as reset } from "@/app/api/auth/reset-password/route";
import { PATCH as profile } from "@/app/api/account/profile/route";
import { POST as changePassword } from "@/app/api/account/password/route";
import { ID, ctx, freshIp, jsonReq } from "./utils";

const User = UserModel as any;
const flush = async () => { await Promise.all(pending.splice(0)); };
const me1 = { id: ID, name: "Ravi Kumar", email: "ravi@x.com", phone: "9876543210" };
let hash = "";
let n = 0;
const email = () => `user${++n}@shop.com`;
beforeAll(async () => { hash = await bcrypt.hash("secret123", 4); });
beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example"); vi.stubEnv("AUTH_SECRET", "x".repeat(32)); });
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/auth/register", () => {
  const body = { name: "Ravi Kumar", email: "Ravi@X.com", phone: "+91 98765 43210", password: "secret123" };
  beforeEach(() => { User.findOne.mockResolvedValue(null); User.create.mockImplementation(async (d: any) => ({ _id: ID, ...d })); });

  it("creates an UNVERIFIED account, emails a 6-digit code and does not sign the customer in yet", async () => {
    const res = await register(jsonReq("/api/auth/register", "POST", body), ctx());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ needsVerification: true, email: "ravi@x.com" });
    const saved = User.create.mock.calls[0][0];
    expect(saved).toMatchObject({ name: "Ravi Kumar", email: "ravi@x.com", phone: "9876543210", emailVerified: false });
    expect(saved.password).toBeUndefined();
    expect(await bcrypt.compare("secret123", saved.passwordHash)).toBe(true);
    const { code, to } = vi.mocked(sendVerificationEmail).mock.calls[0][0];
    expect(to).toBe("ravi@x.com");
    expect(code).toMatch(/^\d{6}$/);
    expect(saved.otpHash).toBe(otpDigest("ravi@x.com", code)); // only a keyed hash is stored
    expect(saved.otpHash).not.toContain(code);
    expect(saved.otpExpires.getTime()).toBeGreaterThan(Date.now() + 9 * 60_000);
    expect(createUserSession).not.toHaveBeenCalled();
  });
  it("409 when a VERIFIED account already uses the email", async () => {
    User.findOne.mockResolvedValue({ _id: "x", emailVerified: true });
    const res = await register(jsonReq("/api/auth/register", "POST", body), ctx());
    expect(res.status).toBe(409);
    expect(User.create).not.toHaveBeenCalled();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
  it("restarts a never-verified sign-up with a new code instead of blocking the address", async () => {
    const old = { _id: ID, emailVerified: false, passwordHash: "old", save: vi.fn() };
    User.findOne.mockResolvedValue(old);
    const res = await register(jsonReq("/api/auth/register", "POST", { ...body, email: email() }), ctx());
    expect(res.status).toBe(201);
    expect(User.create).not.toHaveBeenCalled();
    expect(old.save).toHaveBeenCalled();
    expect(await bcrypt.compare("secret123", old.passwordHash)).toBe(true);
    expect(sendVerificationEmail).toHaveBeenCalled();
  });
  it("502 when the verification email cannot be sent", async () => {
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new Error("resend down"));
    const res = await register(jsonReq("/api/auth/register", "POST", { ...body, email: email() }), ctx());
    expect(res.status).toBe(502);
    expect(createUserSession).not.toHaveBeenCalled();
  });
  it.each([
    ["short password", { password: "short" }], ["bad phone", { phone: "12345" }], ["bad email", { email: "nope" }], ["no name", { name: "" }],
  ])("400 for %s", async (_l, patch) => {
    const res = await register(jsonReq("/api/auth/register", "POST", { ...body, ...patch }), ctx());
    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });
  it("429 after 8 sign-ups from one device", async () => {
    const ip = freshIp();
    const codes: number[] = [];
    for (let i = 0; i < 9; i++) codes.push((await register(jsonReq("/api/auth/register", "POST", { ...body, email: email() }, { "x-forwarded-for": ip }), ctx())).status);
    expect(codes[8]).toBe(429);
  });
});

describe("POST /api/auth/verify-email", () => {
  const E = "ravi@x.com";
  const lookup = (d: unknown) => User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(d) });
  const doc = (over: Record<string, unknown> = {}) => ({ _id: ID, name: "Ravi", email: E, phone: "9876543210", emailVerified: false, otpHash: otpDigest(E, "123456"), otpExpires: new Date(Date.now() + 60_000), otpAttempts: 0, save: vi.fn(), ...over });
  const send = (code = "123456", e = E) => verifyEmail(jsonReq("/api/auth/verify-email", "POST", { email: e, code }), ctx());

  it("right code: marks the email verified, burns the code and signs the customer in", async () => {
    const d = doc();
    lookup(d);
    const res = await send();
    expect(res.status).toBe(200);
    expect(d.emailVerified).toBe(true);
    expect(d.otpHash).toBeUndefined();
    expect(d.save).toHaveBeenCalled();
    expect(createUserSession).toHaveBeenCalledWith(ID);
    expect(JSON.stringify(await res.json())).not.toContain("otp");
  });
  it("wrong code: 400, counts the attempt, no session", async () => {
    const d = doc();
    lookup(d);
    expect((await send("000000")).status).toBe(400);
    expect(d.otpAttempts).toBe(1);
    expect(d.emailVerified).toBe(false);
    expect(createUserSession).not.toHaveBeenCalled();
  });
  it("expired code: 400 asking for a new one", async () => {
    lookup(doc({ otpExpires: new Date(Date.now() - 1000) }));
    const res = await send();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/expired/);
  });
  it("locks after 5 wrong attempts, even for the right code", async () => {
    lookup(doc({ otpAttempts: 5 }));
    expect((await send()).status).toBe(429);
    expect(createUserSession).not.toHaveBeenCalled();
  });
  it("unknown email gets the same answer as a wrong code", async () => {
    lookup(doc());
    const wrong = await send("000000");
    lookup(null);
    const unknown = await send("123456", "ghost@x.com");
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toEqual(await wrong.json());
  });
  it("400 for a malformed code", async () => {
    expect((await send("12ab")).status).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/resend-otp", () => {
  const lookup = (d: unknown) => User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(d) });
  const send = (e: string) => resendOtp(jsonReq("/api/auth/resend-otp", "POST", { email: e }), ctx());
  const pendingUser = (e: string, sentAgoMs: number) => ({ email: e, name: "Ravi", emailVerified: false, otpSentAt: new Date(Date.now() - sentAgoMs), save: vi.fn(), otpHash: undefined as string | undefined });

  it("emails a fresh code to an unverified account", async () => {
    const e = email();
    const d = pendingUser(e, 60_000);
    lookup(d);
    expect((await send(e)).status).toBe(200);
    const { code } = vi.mocked(sendVerificationEmail).mock.calls[0][0];
    expect(d.otpHash).toBe(otpDigest(e, code));
    expect(d.save).toHaveBeenCalled();
  });
  it("respects the 30 second cooldown but answers the same", async () => {
    const e = email();
    lookup(pendingUser(e, 5_000));
    const res = await send(e);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
  it("sends nothing for unknown or already-verified addresses, with the same answer", async () => {
    lookup(null);
    const unknown = await send(email());
    const e = email();
    lookup({ email: e, name: "Ravi", emailVerified: true, save: vi.fn() });
    const verified = await send(e);
    expect(await unknown.json()).toEqual(await verified.json());
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => User.findOne.mockResolvedValue({ _id: ID, email: "ravi@x.com", name: "Ravi", phone: "9876543210", passwordHash: hash }));
  const attempt = (e: string, p: string, ip?: string) => login(jsonReq("/api/auth/login", "POST", { email: e, password: p }, ip ? { "x-forwarded-for": ip } : {}), ctx());

  it("signs in with the right password", async () => {
    const res = await attempt("ravi@x.com", "secret123");
    expect(res.status).toBe(200);
    expect(createUserSession).toHaveBeenCalledWith(ID);
  });
  it("wrong password and unknown email give the same 401", async () => {
    const wrong = await attempt("ravi@x.com", "nope-nope");
    User.findOne.mockResolvedValue(null);
    const unknown = await attempt("ghost@x.com", "secret123");
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await unknown.json()).toEqual(await wrong.json());
    expect(createUserSession).not.toHaveBeenCalled();
  });
  it("a never-verified sign-up gets a new code and a 403 instead of a session", async () => {
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    const d = { _id: ID, email: "ravi@x.com", name: "Ravi", phone: "9876543210", passwordHash: hash, emailVerified: false, save: vi.fn() };
    User.findOne.mockResolvedValue(d);
    const res = await attempt("ravi@x.com", "secret123");
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ needsVerification: true, email: "ravi@x.com" });
    expect(createUserSession).not.toHaveBeenCalled();
    expect(sendVerificationEmail).toHaveBeenCalled();
    expect(d.save).toHaveBeenCalled();
  });
  it("400 for an empty form", async () => {
    expect((await login(jsonReq("/api/auth/login", "POST", {}), ctx())).status).toBe(400);
  });
  it("locks after 8 wrong attempts", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 10; i++) codes.push((await attempt("victim@x.com", `guess-${i}`, "203.0.113.50")).status);
    expect(codes.slice(8)).toEqual([429, 429]);
  });
});

describe("session endpoints", () => {
  it("logout destroys the session", async () => {
    expect((await logout(jsonReq("/api/auth/logout", "POST", {}), ctx())).status).toBe(200);
    expect(destroyUserSession).toHaveBeenCalled();
  });
  it("me: signed out", async () => {
    vi.mocked(getUserSession).mockResolvedValue(null);
    expect(await (await me()).json()).toEqual({ user: null, cart: [], wishlist: [], address: null });
  });
  it("me: signed in returns user, cart, wishlist and saved address in one call", async () => {
    vi.mocked(getUserSession).mockResolvedValue(me1);
    User.findById.mockReturnValue({ select: () => ({ lean: async () => ({ wishlist: ["w1", "w2"], lastAddress: { city: "Pune" } }) }) });
    const body = await (await me()).json();
    expect(body.user).toEqual(me1);
    expect(body.cart).toHaveLength(1);
    expect(body.wishlist).toEqual(["w1", "w2"]);
    expect(body.address).toEqual({ city: "Pune" });
  });
  it("me: a database error looks like signed out instead of crashing the site", async () => {
    vi.mocked(getUserSession).mockRejectedValue(new Error("db down"));
    const res = await me();
    expect(res.status).toBe(200);
    expect((await res.json()).user).toBeNull();
  });
});

describe("forgot / reset password (customers)", () => {
  const userDoc = (e: string) => ({ email: e, name: "Ravi", save: vi.fn(), resetTokenHash: undefined as string | undefined, resetExpires: undefined as Date | undefined });

  it("emails a /?auth=reset link and stores only the token hash for 1 hour", async () => {
    const e = email();
    const doc = userDoc(e);
    User.findOne.mockResolvedValue(doc);
    const res = await forgot(jsonReq("/api/auth/forgot-password", "POST", { email: e }), ctx());
    await flush();
    expect(res.status).toBe(200);
    const link = vi.mocked(sendCustomerResetEmail).mock.calls[0][0].link;
    expect(link.startsWith("https://shop.example/?auth=reset&token=")).toBe(true);
    const token = new URL(link).searchParams.get("token")!;
    expect(doc.resetTokenHash).toBe(sha256(token));
    expect(doc.resetExpires!.getTime()).toBeGreaterThan(Date.now() + 59 * 60_000);
  });
  it("answers the same for an unknown email", async () => {
    User.findOne.mockResolvedValue(null);
    const res = await forgot(jsonReq("/api/auth/forgot-password", "POST", { email: email() }), ctx());
    await flush();
    expect(await res.json()).toEqual({ ok: true });
    expect(sendCustomerResetEmail).not.toHaveBeenCalled();
  });
  it("rate-limits per email (4th request → 429)", async () => {
    const e = email();
    User.findOne.mockResolvedValue(null);
    const codes: number[] = [];
    for (let i = 0; i < 4; i++) codes.push((await forgot(jsonReq("/api/auth/forgot-password", "POST", { email: e }), ctx())).status);
    expect(codes).toEqual([200, 200, 200, 429]);
  });

  describe("reset", () => {
    const TOKEN = "d".repeat(64);
    const body = { email: "ravi@x.com", token: TOKEN, password: "brandnewpass" };
    const lookup = (d: unknown) => User.findOne.mockReturnValue({ select: vi.fn().mockResolvedValue(d) });
    it("sets the new password and burns the token", async () => {
      const d = { passwordHash: "old", resetTokenHash: sha256(TOKEN), resetExpires: new Date(), save: vi.fn() };
      lookup(d);
      expect((await reset(jsonReq("/api/auth/reset-password", "POST", body), ctx())).status).toBe(200);
      expect(await bcrypt.compare("brandnewpass", d.passwordHash)).toBe(true);
      expect(d.resetTokenHash).toBeUndefined();
      expect(User.findOne.mock.calls[0][0].resetTokenHash).toBe(sha256(TOKEN));
    });
    it("400 for a wrong, used or expired token", async () => {
      lookup(null);
      const res = await reset(jsonReq("/api/auth/reset-password", "POST", body), ctx());
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/invalid or has expired/);
    });
    it("400 for a weak password", async () => {
      const res = await reset(jsonReq("/api/auth/reset-password", "POST", { ...body, password: "short" }), ctx());
      expect((await res.json()).error).toBe("Use at least 8 characters");
    });
  });
});

describe("account settings", () => {
  it("profile: 401 when signed out", async () => {
    vi.mocked(getUserSession).mockResolvedValue(null);
    expect((await profile(jsonReq("/api/account/profile", "PATCH", { name: "A B", phone: "9876543210" }), ctx())).status).toBe(401);
  });
  it("profile: saves name and a normalised phone", async () => {
    vi.mocked(getUserSession).mockResolvedValue(me1);
    const res = await profile(jsonReq("/api/account/profile", "PATCH", { name: "Ravi K", phone: "+91 98111 20001" }), ctx());
    expect(res.status).toBe(200);
    expect(User.updateOne).toHaveBeenCalledWith({ _id: ID }, { name: "Ravi K", phone: "9811120001" });
  });
  it("profile: rejects a bad phone", async () => {
    vi.mocked(getUserSession).mockResolvedValue(me1);
    expect((await profile(jsonReq("/api/account/profile", "PATCH", { name: "Ravi K", phone: "123" }), ctx())).status).toBe(400);
  });
  it("password: wrong current password → 400, right one → new hash saved", async () => {
    vi.mocked(getUserSession).mockResolvedValue(me1);
    const doc = { passwordHash: hash, save: vi.fn() };
    User.findById.mockResolvedValue(doc);
    const bad = await changePassword(jsonReq("/api/account/password", "POST", { current: "wrongpass", next: "brandnewpass", confirm: "brandnewpass" }), ctx());
    expect(bad.status).toBe(400);
    expect(doc.save).not.toHaveBeenCalled();
    const good = await changePassword(jsonReq("/api/account/password", "POST", { current: "secret123", next: "brandnewpass", confirm: "brandnewpass" }), ctx());
    expect(good.status).toBe(200);
    expect(await bcrypt.compare("brandnewpass", doc.passwordHash)).toBe(true);
  });
});
