"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { passwordSchema, profileSchema } from "@/lib/validation";
import { postJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useCustomer } from "@/hooks/use-customer";

type Profile = z.infer<typeof profileSchema>;
type Pw = z.infer<typeof passwordSchema>;

export function ProfileForms({ name, email, phone }: { name: string; email: string; phone: string }) {
  const { refresh } = useCustomer();
  const p = useForm<Profile>({ resolver: zodResolver(profileSchema), defaultValues: { name, phone } });
  const pw = useForm<Pw>({ resolver: zodResolver(passwordSchema) });

  const saveProfile = async (v: Profile) => {
    try { await postJson("/api/account/profile", v, "PATCH"); await refresh(); toast.success("Profile updated"); }
    catch (e) { toast.error("Could not save", { description: e instanceof Error ? e.message : "Please try again." }); }
  };
  const changePassword = async (v: Pw) => {
    try { await postJson("/api/account/password", v); toast.success("Password changed"); pw.reset(); }
    catch (e) { toast.error("Could not change password", { description: e instanceof Error ? e.message : "Please try again." }); }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={p.handleSubmit(saveProfile)} noValidate className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <h2 className="text-lg">Your details</h2>
        <Field label="Full name" error={p.formState.errors.name?.message}><Input autoComplete="name" {...p.register("name")} /></Field>
        <Field label="Mobile number" error={p.formState.errors.phone?.message}><Input type="tel" inputMode="tel" autoComplete="tel" {...p.register("phone")} /></Field>
        <Field label="Email" hint="Your email is your login and cannot be changed here."><Input value={email} readOnly disabled /></Field>
        <Button type="submit" disabled={p.formState.isSubmitting}>{p.formState.isSubmitting ? "Saving…" : "Save changes"}</Button>
      </form>

      <form onSubmit={pw.handleSubmit(changePassword)} noValidate className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <h2 className="text-lg">Change password</h2>
        <Field label="Current password" error={pw.formState.errors.current?.message}><Input type="password" autoComplete="current-password" {...pw.register("current")} /></Field>
        <Field label="New password" hint="At least 8 characters" error={pw.formState.errors.next?.message}><Input type="password" autoComplete="new-password" {...pw.register("next")} /></Field>
        <Field label="Confirm new password" error={pw.formState.errors.confirm?.message}><Input type="password" autoComplete="new-password" {...pw.register("confirm")} /></Field>
        <Button type="submit" disabled={pw.formState.isSubmitting}>{pw.formState.isSubmitting ? "Saving…" : "Update password"}</Button>
      </form>
    </div>
  );
}
