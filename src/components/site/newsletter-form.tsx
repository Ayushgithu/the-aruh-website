"use client";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitContact } from "@/lib/api";
import { Button } from "@/components/ui/button";

/** "Get offers on WhatsApp" — saved as an enquiry in the dashboard (Enquiries). */
export function NewsletterForm() {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitContact({ name, phone, message: "Please add me to the offers & new-arrivals list on WhatsApp." });
      toast.success("You are on the list!", { description: "We will WhatsApp you new arrivals and offers." });
      setName(""); setPhone("");
    } catch (err) {
      toast.error("Could not subscribe", { description: err instanceof Error ? err.message : "Please check your details." });
    } finally { setBusy(false); }
  };
  const field = "h-12 min-w-0 flex-1 rounded-full border border-white/25 bg-white/10 px-5 text-sm text-white outline-none placeholder:text-white/60 focus:border-white/70";
  return (
    <form onSubmit={submit} className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
      <input aria-label="Your name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
      <input aria-label="WhatsApp number" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number" className={field} />
      <Button type="submit" size="lg" disabled={busy} className="rounded-full bg-white text-primary hover:bg-white/90">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}</Button>
    </form>
  );
}
