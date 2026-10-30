"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { contactSchema, type ContactValues } from "@/lib/validation";
import { submitContact } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";

export function ContactForm() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (v: ContactValues) => {
    try {
      await submitContact(v);
      toast.success("Message sent", { description: "We will get back to you shortly." });
      reset();
    } catch (e) {
      toast.error("Could not send your message", { description: e instanceof Error ? e.message : "Please try again or message us on WhatsApp." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" error={errors.name?.message}>
          <Input autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Phone number" error={errors.phone?.message}>
          <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!errors.phone} {...register("phone")} />
        </Field>
      </div>
      <Field label="How can we help?" error={errors.message?.message}>
        <Textarea aria-invalid={!!errors.message} placeholder="I need help choosing a size for the green suit set…" {...register("message")} />
      </Field>
      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send message"}
      </Button>
    </form>
  );
}
