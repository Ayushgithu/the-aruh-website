"use client";
import * as React from "react";
import { site } from "@/lib/site";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { customerLoginSchema, forgotSchema, profileSchema, registerSchema } from "@/lib/validation";
import { ApiError, postJson } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/form";
import { LogoMark } from "@/components/ui/icons";
import { GoogleButton, googleEnabled } from "./google-button";

export type CustomerAuthMode = "login" | "register" | "forgot" | "sent" | "reset" | "verify" | "phone";

const TITLES: Record<CustomerAuthMode, string> = {
  login: "Sign in",
  register: "Create your account",
  forgot: "Forgot password",
  sent: "Check your email",
  reset: "Choose a new password",
  verify: "Verify your email",
  phone: "One last step",
};

const resetFormSchema = z
  .object({ password: z.string().min(8, "Use at least 8 characters"), confirm: z.string().min(1, "Confirm your new password") })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export function CustomerAuthModal({ open, initialMode, resetToken, resetEmail, onClose, onAuthed }: {
  open: boolean; initialMode: CustomerAuthMode; resetToken?: string; resetEmail?: string; onClose: () => void; onAuthed: () => void | Promise<void>;
}) {
  const [mode, setMode] = React.useState<CustomerAuthMode>(initialMode);
  const [email, setEmail] = React.useState("");
  const [googleName, setGoogleName] = React.useState("");
  const [googleError, setGoogleError] = React.useState("");
  React.useEffect(() => { if (open) { setMode(initialMode); setGoogleError(""); } }, [open, initialMode]);

  const tabs = mode === "login" || mode === "register";

  const goVerify = React.useCallback((e: string) => { setEmail(e); setMode("verify"); }, []);
  const onGoogle = React.useCallback(async (credential: string) => {
    setGoogleError("");
    try {
      const r = await postJson<{ user: { name: string }; needsPhone: boolean }>("/api/auth/google", { credential });
      if (r.needsPhone) { setGoogleName(r.user.name); setMode("phone"); return; }
      toast.success("Signed in with Google");
      await onAuthed();
    } catch (e) { setGoogleError(e instanceof Error ? e.message : "Google sign-in failed. Please try again."); }
  }, [onAuthed]);

  return (
    <Dialog open={open} onClose={onClose} title={TITLES[mode]}>
      <div className="mb-5 flex items-center gap-3">
        <LogoMark className="h-10 w-10 shrink-0" />
        <p className="text-sm">
          {mode === "login" && "Welcome back! Sign in to use your cart, track orders and save favourites."}
          {mode === "register" && "Create an account to buy, track your orders and save your cart."}
          {mode === "forgot" && "Enter your email and we will send you a link to reset your password."}
          {mode === "sent" && "If an account exists for that email, a reset link is on its way."}
          {mode === "reset" && `Setting a new password for ${resetEmail}.`}
          {mode === "verify" && `We emailed a 6-digit code to ${email}. Enter it below to finish.`}
          {mode === "phone" && `Welcome${googleName ? `, ${googleName.split(" ")[0]}` : ""}! Add your mobile number so we can send delivery updates.`}
        </p>
      </div>

      {tabs && (
        <div role="tablist" aria-label="Account" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
          {(["login", "register"] as const).map((m) => (
            <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => setMode(m)}
              className={cn("min-h-10 rounded-lg text-sm font-semibold transition", mode === m ? "bg-card text-ink shadow-card" : "text-body hover:text-ink")}>
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      )}

      {tabs && googleEnabled && (
        <div className="mb-5 space-y-3">
          <GoogleButton text={mode === "register" ? "signup_with" : "signin_with"} onCredential={onGoogle} />
          <ErrorBox msg={googleError} />
          <div className="flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-line" /> or use your email <span className="h-px flex-1 bg-line" /></div>
        </div>
      )}

      {mode === "login" && <LoginPanel onForgot={(e) => { setEmail(e); setMode("forgot"); }} onAuthed={onAuthed} onVerify={goVerify} />}
      {mode === "register" && <RegisterPanel onVerify={goVerify} />}
      {mode === "verify" && <VerifyPanel email={email} onAuthed={onAuthed} onBack={() => setMode("register")} />}
      {mode === "phone" && <PhonePanel name={googleName} onDone={onAuthed} />}
      {mode === "forgot" && <ForgotPanel initialEmail={email} onBack={() => setMode("login")} onSent={(e) => { setEmail(e); setMode("sent"); }} />}
      {mode === "sent" && <SentPanel email={email} onBack={() => setMode("login")} onResend={() => setMode("forgot")} />}
      {mode === "reset" && resetToken && resetEmail && (
        <ResetPanel token={resetToken} email={resetEmail} onDone={() => { toast.success("Password updated", { description: "Sign in with your new password." }); setMode("login"); }} />
      )}
    </Dialog>
  );
}

const ErrorBox = ({ msg }: { msg: string }) => (msg ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{msg}</p> : null);

function PasswordField({ id, label = "Password", error, autoComplete, reg }: { id: string; label?: string; error?: string; autoComplete: string; reg: React.InputHTMLAttributes<HTMLInputElement> }) {
  const [show, setShow] = React.useState(false);
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} className="pr-12" aria-invalid={!!error} {...reg} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-500 hover:text-ink">
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </Field>
  );
}

/* ---------------------------------- Sign in ---------------------------------- */
type LoginValues = z.infer<typeof customerLoginSchema>;

function LoginPanel({ onForgot, onAuthed, onVerify }: { onForgot: (email: string) => void; onAuthed: () => void | Promise<void>; onVerify: (email: string) => void }) {
  const [error, setError] = React.useState("");
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(customerLoginSchema) });
  const onSubmit = async (v: LoginValues) => {
    setError("");
    try {
      await postJson("/api/auth/login", v);
      toast.success("Welcome back");
      await onAuthed();
    } catch (e) {
      // signed up earlier but never entered the emailed code: the server just sent a new one
      if (e instanceof ApiError && e.status === 403 && e.data.needsVerification) { toast("Verify your email", { description: "We sent you a new code." }); onVerify(v.email.trim().toLowerCase()); return; }
      setError(e instanceof Error ? e.message : "Sign-in failed");
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <ErrorBox msg={error} />
      <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email} {...register("email")} /></Field>
      <PasswordField id="customer-password" autoComplete="current-password" error={errors.password?.message} reg={register("password")} />
      <div className="flex justify-end">
        <button type="button" onClick={() => onForgot(getValues("email") ?? "")} className="min-h-9 text-sm font-semibold text-primary hover:underline">Forgot password?</button>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
      </Button>
    </form>
  );
}

/* --------------------------------- Register --------------------------------- */
type RegisterValues = z.input<typeof registerSchema>;

function RegisterPanel({ onVerify }: { onVerify: (email: string) => void }) {
  const [error, setError] = React.useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const onSubmit = async (v: RegisterValues) => {
    setError("");
    try {
      const r = await postJson<{ email?: string }>("/api/auth/register", v);
      toast.success("Check your email", { description: "We sent you a 6-digit verification code." });
      onVerify(r.email ?? v.email.trim().toLowerCase());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create your account."); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <ErrorBox msg={error} />
      <Field label="Full name" error={errors.name?.message}><Input autoComplete="name" autoFocus aria-invalid={!!errors.name} {...register("name")} /></Field>
      <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
      <Field label="Mobile number" error={errors.phone?.message} hint="For delivery updates">
        <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!errors.phone} {...register("phone")} />
      </Field>
      <PasswordField id="customer-new-password" label="Password" autoComplete="new-password" error={errors.password?.message} reg={register("password")} />
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : "Create account"}
      </Button>
    </form>
  );
}

/* ----------------------------- Email code (OTP) ----------------------------- */
const RESEND_SECONDS = 30;

function VerifyPanel({ email, onAuthed, onBack }: { email: string; onAuthed: () => void | Promise<void>; onBack: () => void }) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [wait, setWait] = React.useState(RESEND_SECONDS); // a code was just sent, so resend unlocks after the cooldown

  React.useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError("Enter the 6-digit code from the email."); return; }
    setError(""); setBusy(true);
    try {
      await postJson("/api/auth/verify-email", { email, code });
      toast.success("Email verified", { description: `Welcome to ${site.name}!` });
      await onAuthed();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not verify the code."); }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setError("");
    try { await postJson("/api/auth/resend-otp", { email }); toast.success("New code sent", { description: email }); setCode(""); setWait(RESEND_SECONDS); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not send a new code."); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <ErrorBox msg={error} />
      <Field label="Verification code" htmlFor="customer-otp">
        <Input id="customer-otp" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} placeholder="••••••"
          className="text-center text-2xl font-bold tracking-[0.5em]" />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={busy || code.length !== 6}>
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : "Verify & continue"}
      </Button>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Change email</Button>
        <Button type="button" variant="outline" size="sm" onClick={resend} disabled={wait > 0}>{wait > 0 ? `Resend code in ${wait}s` : "Resend code"}</Button>
      </div>
      <p className="text-center text-xs">Valid for 10 minutes. Check your spam folder if you do not see it.</p>
    </form>
  );
}

/* After Google sign-in (Google does not share a phone number). */
const phoneOnlySchema = profileSchema.pick({ phone: true });
function PhonePanel({ name, onDone }: { name: string; onDone: () => void | Promise<void> }) {
  const [error, setError] = React.useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.input<typeof phoneOnlySchema>>({ resolver: zodResolver(phoneOnlySchema) });
  const onSubmit = async (v: z.input<typeof phoneOnlySchema>) => {
    setError("");
    try { await postJson("/api/account/profile", { name: name.length >= 2 ? name : "Customer", phone: v.phone }, "PATCH"); await onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save your number."); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <ErrorBox msg={error} />
      <Field label="Mobile number" error={errors.phone?.message} hint="For delivery updates">
        <Input type="tel" inputMode="tel" autoComplete="tel" autoFocus placeholder="98765 43210" aria-invalid={!!errors.phone} {...register("phone")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save and continue"}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={() => void onDone()}>Skip for now</Button>
    </form>
  );
}

/* ----------------------------- Forgot / reset ----------------------------- */
function ForgotPanel({ initialEmail, onBack, onSent }: { initialEmail: string; onBack: () => void; onSent: (email: string) => void }) {
  const [error, setError] = React.useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: initialEmail } });
  const onSubmit = async (v: z.infer<typeof forgotSchema>) => {
    setError("");
    try { await postJson("/api/auth/forgot-password", v); onSent(v.email); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not send the email. Please try again."); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <ErrorBox msg={error} />
      <Field label="Email" error={errors.email?.message}><Input type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email} {...register("email")} /></Field>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send reset link"}
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back to sign in</Button>
    </form>
  );
}

function SentPanel({ email, onBack, onResend }: { email: string; onBack: () => void; onResend: () => void }) {
  return (
    <div className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-success"><MailCheck className="h-7 w-7" /></span>
      <p className="mt-4 text-sm">We sent a reset link to <strong className="font-semibold text-ink">{email}</strong>. It is valid for 1 hour. Check your spam folder if you do not see it.</p>
      <div className="mt-6 grid gap-2">
        <Button type="button" variant="outline" onClick={onResend}>Use a different email / send again</Button>
        <Button type="button" variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back to sign in</Button>
      </div>
    </div>
  );
}

function ResetPanel({ token, email, onDone }: { token: string; email: string; onDone: () => void }) {
  const [error, setError] = React.useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof resetFormSchema>>({ resolver: zodResolver(resetFormSchema) });
  const onSubmit = async (v: z.infer<typeof resetFormSchema>) => {
    setError("");
    try { await postJson("/api/auth/reset-password", { email, token, password: v.password }); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update the password."); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <ErrorBox msg={error} />
      <Field label="New password" hint="At least 8 characters" error={errors.password?.message}><Input type="password" autoComplete="new-password" autoFocus aria-invalid={!!errors.password} {...register("password")} /></Field>
      <Field label="Confirm new password" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register("confirm")} /></Field>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Update password"}
      </Button>
    </form>
  );
}
