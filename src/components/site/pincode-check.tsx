"use client";
import * as React from "react";
import { Loader2, MapPin, Truck, XCircle } from "lucide-react";
import { request } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Result { deliverable: boolean; pin: string; by?: string; range?: string; cod?: boolean }

export function PincodeCheck() {
  const [pin, setPin] = React.useState("");
  const [res, setRes] = React.useState<Result | null>(null);
  const [err, setErr] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { try { const s = localStorage.getItem("lc_pin"); if (s) setPin(s); } catch {} }, []);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[1-9]\d{5}$/.test(pin)) { setErr("Enter a valid 6-digit pincode"); setRes(null); return; }
    setErr(""); setBusy(true);
    try {
      setRes(await request<Result>(`/api/pincode?pin=${pin}`));
      try { localStorage.setItem("lc_pin", pin); } catch {}
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Could not check right now."); setRes(null); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink"><MapPin className="h-4 w-4 text-primary" /> Check delivery</p>
      <form onSubmit={check} className="mt-3 flex gap-2">
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Enter pincode" aria-label="Pincode"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-4 text-sm text-ink outline-none focus:border-primary" />
        <Button type="submit" variant="outline" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}</Button>
      </form>
      {err && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{err}</p>}
      {res && res.deliverable && (
        <p className="mt-3 flex items-start gap-2 text-sm"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> <span>Get it by <strong className="text-ink">{res.by}</strong>{res.range && res.range !== res.by ? <span> (between {res.range})</span> : null} at <strong className="text-ink">{res.pin}</strong>. {res.cod ? "Cash on delivery available." : "Online payment only for this pincode."}</span></p>
      )}
      {res && !res.deliverable && <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-red-600"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /> Sorry, we do not deliver to {res.pin} yet.</p>}
    </div>
  );
}
