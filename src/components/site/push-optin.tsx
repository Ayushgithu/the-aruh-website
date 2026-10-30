"use client";
import * as React from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { postJson } from "@/lib/api";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const toKey = (b64: string) => { const p = "=".repeat((4 - (b64.length % 4)) % 4); const raw = atob((b64 + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };

/** "Get alerts" switch. Hidden when the browser can't do push or no VAPID key is configured. */
export function PushOptIn({ className = "" }: { className?: string }) {
  const [supported, setSupported] = React.useState(false);
  const [on, setOn] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    setSupported(true);
    navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => setOn(!!s)).catch(() => {});
  }, []);
  if (!supported) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await postJson("/api/push/subscribe", { endpoint: existing.endpoint }, "DELETE").catch(() => {});
        await existing.unsubscribe();
        setOn(false); toast("Alerts turned off");
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") { toast.error("Notifications are blocked", { description: "Allow them in your browser settings to get alerts." }); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(KEY) });
      await postJson("/api/push/subscribe", sub.toJSON());
      setOn(true); toast.success("You will get new-arrival and sale alerts");
    } catch (e) { toast.error("Could not change alerts", { description: e instanceof Error ? e.message : "Please try again." }); }
    finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={() => void toggle()} disabled={busy} aria-pressed={on} className={`inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline ${className}`}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />} {on ? "Turn off alerts" : "Get new-arrival & sale alerts"}
    </button>
  );
}
