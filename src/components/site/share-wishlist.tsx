"use client";
import * as React from "react";
import { Link2, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { postJson } from "@/lib/api";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function ShareWishlist() {
  const [busy, setBusy] = React.useState(false);
  const link = async () => (window.location.origin + (await postJson<{ path: string }>("/api/wishlist/share", {})).path);
  const run = async (how: "copy" | "whatsapp" | "native") => {
    setBusy(true);
    try {
      const url = await link();
      if (how === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(`Look at my wishlist 💖 ${url}`)}`, "_blank", "noopener");
      else if (how === "native" && navigator.share) await navigator.share({ title: "My wishlist", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied", { description: "Send it to anyone — they can see your wishlist." }); }
    } catch (e) { if ((e as Error)?.name !== "AbortError") toast.error("Could not create the link", { description: e instanceof Error ? e.message : "Please try again." }); }
    finally { setBusy(false); }
  };
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl bg-primary-faint p-4">
      <p className="mr-auto text-sm font-medium text-ink">Share your wishlist with family or friends — “ye dilwa do” 😄</p>
      <Button variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => void run("copy")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Copy link</Button>
      <Button size="sm" variant="whatsapp" className="rounded-full" disabled={busy} onClick={() => void run("whatsapp")}><WhatsAppIcon className="h-4 w-4" /> WhatsApp</Button>
      <Button variant="outline" size="icon" className="rounded-full sm:hidden" aria-label="Share" disabled={busy} onClick={() => void run("native")}><Share2 className="h-4 w-4" /></Button>
    </div>
  );
}
