// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
vi.mock("jose", () => ({ createRemoteJWKSet: vi.fn(() => ({})), jwtVerify: vi.fn() }));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/user-auth", () => ({ createUserSession: vi.fn() }));
vi.mock("@/models/User", () => ({ UserModel: { create: vi.fn(), findOne: vi.fn() } }));

import { jwtVerify } from "jose";
import { createUserSession } from "@/lib/user-auth";
import { UserModel } from "@/models/User";
import { POST as google } from "@/app/api/auth/google/route";
import { ID, ctx, jsonReq } from "./utils";

const User = UserModel as any;
const CLIENT = "client-123.apps.googleusercontent.com";
const claims = (over: Record<string, unknown> = {}) => ({ payload: { sub: "g-1", email: "Ravi@Gmail.com", email_verified: true, name: "Ravi Kumar", ...over } });
const post = () => google(jsonReq("/api/auth/google", "POST", { credential: "x".repeat(40) }), ctx());

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", CLIENT);
  vi.mocked(jwtVerify).mockResolvedValue(claims() as any);
  User.findOne.mockResolvedValue(null);
  User.create.mockImplementation(async (d: any) => ({ _id: ID, ...d }));
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/auth/google", () => {
  it("503 when Google sign-in is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    expect((await post()).status).toBe(503);
    expect(createUserSession).not.toHaveBeenCalled();
  });
  it("checks the token against Google's keys, our client id and Google as issuer", async () => {
    await post();
    expect(jwtVerify).toHaveBeenCalledWith(expect.any(String), expect.anything(), expect.objectContaining({ audience: CLIENT, issuer: expect.arrayContaining(["https://accounts.google.com"]) }));
  });
  it("401 when the token does not verify", async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error("bad signature"));
    expect((await post()).status).toBe(401);
    expect(createUserSession).not.toHaveBeenCalled();
  });
  it("401 when Google says the email is not verified", async () => {
    vi.mocked(jwtVerify).mockResolvedValue(claims({ email_verified: false }) as any);
    expect((await post()).status).toBe(401);
    expect(User.create).not.toHaveBeenCalled();
  });
  it("creates a verified account for a first-time visitor and asks for a phone number", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(User.create.mock.calls[0][0]).toMatchObject({ email: "ravi@gmail.com", name: "Ravi Kumar", googleId: "g-1", emailVerified: true, phone: "" });
    expect(createUserSession).toHaveBeenCalledWith(ID);
    const body = await res.json();
    expect(body.needsPhone).toBe(true);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });
  it("links Google to an existing password account with the same email", async () => {
    const d = { _id: ID, name: "Ravi", email: "ravi@gmail.com", phone: "9876543210", emailVerified: true, passwordHash: "keep", save: vi.fn() } as any;
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(d);
    const res = await post();
    expect(d.googleId).toBe("g-1");
    expect(d.passwordHash).toBe("keep");
    expect(d.save).toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
    expect((await res.json()).needsPhone).toBe(false);
  });
  it("a never-verified email sign-up is taken over by the real inbox owner and its password is discarded", async () => {
    const d = { _id: ID, name: "Ravi", email: "ravi@gmail.com", phone: "", emailVerified: false, passwordHash: "squatter", otpHash: "h", save: vi.fn() } as any;
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(d);
    await post();
    expect(d.emailVerified).toBe(true);
    expect(d.passwordHash).not.toBe("squatter");
    expect(d.otpHash).toBeUndefined();
  });
  it("409 when the email is already tied to a different Google account", async () => {
    User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: ID, googleId: "someone-else", save: vi.fn() });
    expect((await post()).status).toBe(409);
    expect(createUserSession).not.toHaveBeenCalled();
  });
});
