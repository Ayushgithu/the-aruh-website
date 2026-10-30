import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { CustomerAuthModal, type CustomerAuthMode } from "@/components/site/customer-auth-modal";
import { mockFetch, sentBody } from "../helpers";

const TOKEN = "e".repeat(64);
const setup = (mode: CustomerAuthMode = "login", extra: { resetToken?: string; resetEmail?: string } = {}) => {
  const onAuthed = vi.fn();
  const onClose = vi.fn();
  render(<CustomerAuthModal open initialMode={mode} onClose={onClose} onAuthed={onAuthed} {...extra} />);
  return { onAuthed, onClose, user: userEvent.setup() };
};
const dialog = (name: string) => screen.getByRole("dialog", { name });

describe("<CustomerAuthModal /> sign in", () => {
  it("opens as 'Sign in' with tabs for Sign in / Create account", () => {
    setup();
    expect(dialog("Sign in")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sign in" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Create account" })).toBeInTheDocument();
  });

  it("validates before calling the server", async () => {
    const fetchMock = mockFetch(() => ({}));
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signs in and tells the app (cart, wishlist and any pending action continue from there)", async () => {
    const fetchMock = mockFetch(() => ({ body: { user: {} } }));
    const { user, onAuthed } = setup();
    await user.type(screen.getByLabelText("Email"), "ravi@x.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(onAuthed).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/login");
    expect(sentBody(fetchMock)).toEqual({ email: "ravi@x.com", password: "secret123" });
  });

  it("shows wrong-password errors and stays open", async () => {
    mockFetch(() => ({ status: 401, body: { error: "Incorrect email or password." } }));
    const { user, onAuthed } = setup();
    await user.type(screen.getByLabelText("Email"), "ravi@x.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(onAuthed).not.toHaveBeenCalled();
  });

  it("toggles password visibility", async () => {
    const { user } = setup();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });
});

describe("<CustomerAuthModal /> create account", () => {
  const fill = async (user: ReturnType<typeof userEvent.setup>, over: Record<string, string> = {}) => {
    const v = { name: "Ravi Kumar", email: "ravi@x.com", phone: "98765 43210", password: "secret123", ...over };
    await user.type(screen.getByLabelText("Full name"), v.name);
    await user.type(screen.getByLabelText("Email"), v.email);
    await user.type(screen.getByLabelText("Mobile number"), v.phone);
    await user.type(screen.getByLabelText("Password"), v.password);
  };

  it("switches to the registration form from the tab", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("tab", { name: "Create account" }));
    expect(dialog("Create your account")).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
  });

  it("creates the account, then asks for the emailed code instead of signing in", async () => {
    const fetchMock = mockFetch(() => ({ status: 201, body: { needsVerification: true, email: "ravi@x.com" } }));
    const { user, onAuthed } = setup("register");
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("dialog", { name: "Verify your email" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/register");
    expect(sentBody(fetchMock)).toEqual({ name: "Ravi Kumar", email: "ravi@x.com", phone: "98765 43210", password: "secret123" });
    expect(toast.success).toHaveBeenCalledWith("Check your email", expect.anything());
    expect(onAuthed).not.toHaveBeenCalled();
  });

  it("validates name, phone and password length", async () => {
    const fetchMock = mockFetch(() => ({}));
    const { user } = setup("register");
    await fill(user, { phone: "123", password: "short" });
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter a valid 10-digit mobile number")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tells the visitor when the email already has an account", async () => {
    mockFetch(() => ({ status: 409, body: { error: "An account with this email already exists. Try signing in instead." } }));
    const { user, onAuthed } = setup("register");
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
    expect(onAuthed).not.toHaveBeenCalled();
  });
});

describe("<CustomerAuthModal /> forgot + reset password", () => {
  it("keeps the typed email when moving to 'Forgot password'", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("Email"), "ravi@x.com");
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));
    expect(dialog("Forgot password")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("ravi@x.com");
  });

  it("requests the link and shows 'Check your email'", async () => {
    const fetchMock = mockFetch(() => ({ body: { ok: true } }));
    const { user } = setup("forgot");
    await user.type(screen.getByLabelText("Email"), "ravi@x.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByRole("dialog", { name: "Check your email" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/forgot-password");
    expect(within(dialog("Check your email")).getByText("ravi@x.com")).toBeInTheDocument();
  });

  it("rejects an invalid email locally", async () => {
    const fetchMock = mockFetch(() => ({}));
    const { user } = setup("forgot");
    await user.type(screen.getByLabelText("Email"), "nope");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reset: sends token + email + new password, then returns to sign in", async () => {
    const fetchMock = mockFetch(() => ({ body: { ok: true } }));
    const { user } = setup("reset", { resetToken: TOKEN, resetEmail: "ravi@x.com" });
    await user.type(screen.getByLabelText("New password"), "brandnewpass");
    await user.type(screen.getByLabelText("Confirm new password"), "brandnewpass");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(await screen.findByRole("dialog", { name: "Sign in" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/reset-password");
    expect(sentBody(fetchMock)).toEqual({ email: "ravi@x.com", token: TOKEN, password: "brandnewpass" });
  });

  it("reset: blocks mismatched passwords and shows expired-link errors", async () => {
    mockFetch(() => ({ status: 400, body: { error: "This reset link is invalid or has expired. Please request a new one." } }));
    const { user } = setup("reset", { resetToken: TOKEN, resetEmail: "ravi@x.com" });
    await user.type(screen.getByLabelText("New password"), "brandnewpass");
    await user.type(screen.getByLabelText("Confirm new password"), "different123");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Confirm new password"));
    await user.type(screen.getByLabelText("Confirm new password"), "brandnewpass");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid or has expired");
  });
});

describe("<CustomerAuthModal /> email verification code", () => {
  const toVerify = async () => {
    const fetchMock = mockFetch((url) => (url.endsWith("/api/auth/register") ? { status: 201, body: { needsVerification: true, email: "ravi@x.com" } } : { body: { user: {} } }));
    const ctx = setup("register");
    await ctx.user.type(screen.getByLabelText("Full name"), "Ravi Kumar");
    await ctx.user.type(screen.getByLabelText("Email"), "ravi@x.com");
    await ctx.user.type(screen.getByLabelText("Mobile number"), "98765 43210");
    await ctx.user.type(screen.getByLabelText("Password"), "secret123");
    await ctx.user.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByRole("dialog", { name: "Verify your email" });
    return { ...ctx, fetchMock };
  };

  it("submits email + code and signs in", async () => {
    const { user, onAuthed, fetchMock } = await toVerify();
    expect(screen.getByRole("button", { name: "Verify & continue" })).toBeDisabled();
    await user.type(screen.getByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify & continue" }));
    await waitFor(() => expect(onAuthed).toHaveBeenCalled());
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/verify-email");
    expect(sentBody(fetchMock, 1)).toEqual({ email: "ravi@x.com", code: "123456" });
  });

  it("only accepts digits, at most 6", async () => {
    const { user } = await toVerify();
    await user.type(screen.getByLabelText("Verification code"), "12ab34567890");
    expect(screen.getByLabelText("Verification code")).toHaveValue("123456");
  });

  it("shows a wrong-code error and stays on the code screen", async () => {
    const { user, onAuthed, fetchMock } = await toVerify();
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ error: "That code is not correct. Check the email and try again." }), { status: 400, headers: { "Content-Type": "application/json" } }));
    await user.type(screen.getByLabelText("Verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify & continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not correct");
    expect(onAuthed).not.toHaveBeenCalled();
  });

  it("resend is locked for the first 30 seconds", async () => {
    await toVerify();
    expect(screen.getByRole("button", { name: /Resend code in \d+s/ })).toBeDisabled();
  });

  it("signing in with an unverified account jumps to the code screen", async () => {
    mockFetch(() => ({ status: 403, body: { error: "Please verify your email first. We sent you a new code.", needsVerification: true, email: "ravi@x.com" } }));
    const { user } = setup();
    await user.type(screen.getByLabelText("Email"), "ravi@x.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("dialog", { name: "Verify your email" })).toBeInTheDocument();
  });
});
