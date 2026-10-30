"use client";
import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { postJson } from "@/lib/api";
import type { OrderStatus, Tracking, TrackingEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ShipmentTracker } from "./order-tracker";

interface Found { orderNumber: string; status: OrderStatus; createdAt: string; items: { name: string; size?: string; color?: string; quantity: number }[]; tracking?: Tracking & { url: string | null }; trackingEvents: TrackingEvent[] }

export function TrackForm() {
  const [orderNumber, setOrderNumber] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [found, setFound] = React.useState<Found | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setFound(null);
    try { setFound((await postJson<{ order: Found }>("/api/track", { orderNumber, phone })).order); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not find that order."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-xl">
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <Field label="Order number"><Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="OD-250101-AB12CD" autoComplete="off" /></Field>
        <Field label="Mobile number used for the order"><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" /></Field>
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" size="lg" className="w-full rounded-full" disabled={busy || orderNumber.length < 5 || phone.replace(/\D/g, "").length < 10}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Track order</Button>
      </form>
      {found && (
        <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6" aria-label="Order status">
          <h2 className="text-xl">Order {found.orderNumber}</h2>
          <p className="mb-5 text-sm">{found.items.map((i) => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ""}`).join(", ")}</p>
          <ShipmentTracker status={found.status} tracking={found.tracking} events={found.trackingEvents} />
        </section>
      )}
    </div>
  );
}
