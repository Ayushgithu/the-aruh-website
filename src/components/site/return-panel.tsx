"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, PackageX, RefreshCcw, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import type { Order, ReturnRequest, ReturnType } from "@/lib/types";
import { RETURN_STATUS_LABEL, type Eligibility } from "@/lib/returns-rules";
import { postJson } from "@/lib/api";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/drawer";
import { Field, Select, Textarea } from "@/components/ui/form";
import { ItemThumb } from "./order-ui";

interface Props {
  order: Order; requests: ReturnRequest[]; eligibility: Eligibility;
  reasons: string[]; note: string; sizes: Record<string, { label: string; qty: number }[]>;
  wallet: { enabled: boolean; bonusPercent: number };
}

const badge = (s: ReturnRequest["status"]) => cn("rounded-full px-2.5 py-1 text-xs font-bold",
  s === "refunded" || s === "exchange_shipped" ? "bg-emerald-50 text-emerald-700" : s === "rejected" || s === "cancelled" ? "bg-red-50 text-red-700" : s === "requested" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700");

export function ReturnPanel({ order, requests, eligibility: el, reasons, note, sizes, wallet }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<ReturnType>("return");
  const [qty, setQty] = React.useState<Record<number, number>>({});
  const [reason, setReason] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [newSize, setNewSize] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [refundTo, setRefundTo] = React.useState<"original" | "wallet">("original");
  const [details, setDetails] = React.useState("");
  const isCod = order.payment.method === "cod";
  const [busy, setBusy] = React.useState(false);

  const usable = el.items.filter((i) => i.remaining > 0 && (type === "return" ? i.canReturn : i.canExchange));
  const canReturn = el.items.some((i) => i.remaining > 0 && i.canReturn);
  const canExchange = el.items.some((i) => i.remaining > 0 && i.canExchange);
  const pickedIdx = Object.keys(qty).map(Number).filter((k) => qty[k] > 0);
  const exchangeItem = type === "exchange" && pickedIdx.length === 1 ? order.items[pickedIdx[0]] : null;
  const sizeOptions = exchangeItem ? (sizes[exchangeItem.productId] ?? []).filter((s) => s.qty >= (qty[pickedIdx[0]] ?? 1) && s.label !== exchangeItem.size) : [];

  const reset = () => { setQty({}); setReason(""); setComment(""); setNewSize(""); setFiles([]); setRefundTo(wallet.enabled ? "wallet" : "original"); setDetails(""); };
  const toggle = (index: number, remaining: number) => setQty((q) => {
    if (type === "exchange") return q[index] ? {} : { [index]: Math.min(1, remaining) };
    return { ...q, [index]: q[index] ? 0 : 1 };
  });

  const submit = async () => {
    if (!pickedIdx.length) { toast.error("Choose at least one item"); return; }
    if (!reason) { toast.error("Please choose a reason"); return; }
    if (type === "exchange" && !newSize) { toast.error("Choose the size you want instead"); return; }
    if (type === "return" && refundTo === "original" && isCod && details.trim().length < 5) { toast.error("Add your UPI ID or bank details", { description: "We need them to send your refund." }); return; }
    setBusy(true);
    try {
      let photos: string[] = [];
      if (files.length) {
        const fd = new FormData(); files.forEach((f) => fd.append("files", f));
        const r = await fetch("/api/returns/upload", { method: "POST", body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error ?? "Photo upload failed.");
        photos = j.urls;
      }
      await postJson(`/api/orders/${order.id}/returns`, { type, items: pickedIdx.map((index) => ({ index, quantity: qty[index] })), reason, comment, photos, exchangeTo: type === "exchange" ? { size: newSize } : undefined, ...(type === "return" ? { refundTo, refundDetails: refundTo === "original" && isCod ? details.trim() : undefined } : {}) });
      toast.success("Request sent", { description: "We will review it and update you here and by email." });
      setOpen(false); reset(); router.refresh();
    } catch (e) { toast.error("Could not send your request", { description: e instanceof Error ? e.message : "Please try again." }); }
    finally { setBusy(false); }
  };

  const withdraw = async (id: string) => {
    try { await postJson(`/api/orders/${order.id}/returns/${id}`, {}, "DELETE"); toast.success("Request withdrawn"); router.refresh(); }
    catch (e) { toast.error("Could not withdraw", { description: e instanceof Error ? e.message : "Please try again." }); }
  };

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card" aria-labelledby="returns">
      <h3 id="returns" className="flex items-center gap-2 text-base font-semibold"><Undo2 className="h-4 w-4 text-primary" /> Returns &amp; exchange</h3>

      {requests.length > 0 && (
        <ul className="mt-4 space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{r.number} · {r.type === "exchange" ? "Exchange" : "Return"}</p>
                <span className={badge(r.status)}>{RETURN_STATUS_LABEL[r.status]}</span>
              </div>
              <p className="mt-1 text-sm">{r.items.map((i) => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ""}`).join(", ")}{r.exchangeTo?.size ? ` → size ${r.exchangeTo.size}` : ""}</p>
              <p className="text-xs">Reason: {r.reason}</p>
              {r.status === "rejected" && r.adminNote && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{r.adminNote}</p>}
              {r.pickup?.awb && <p className="mt-2 text-xs">Pickup tracking: <strong className="text-ink">{r.pickup.carrier ? `${r.pickup.carrier} · ` : ""}{r.pickup.awb}</strong></p>}
              {r.refund && <p className="mt-2 text-sm font-medium text-emerald-700">{r.refund.method === "wallet" ? <>Added {formatPrice(r.refund.amount + (r.refund.bonus ?? 0))} to your wallet{r.refund.bonus ? ` (includes ${formatPrice(r.refund.bonus)} bonus)` : ""}</> : <>Refunded {formatPrice(r.refund.amount)}{r.refund.method === "razorpay" ? " to your original payment method (5–7 working days)" : ""}</>}{r.refund.note ? ` — ${r.refund.note}` : ""}</p>}
              {r.exchangeShipment?.awb && <p className="mt-2 text-xs">Replacement tracking: <strong className="text-ink">{r.exchangeShipment.carrier ? `${r.exchangeShipment.carrier} · ` : ""}{r.exchangeShipment.awb}</strong></p>}
              {r.status === "requested" && <Button variant="ghost" size="sm" className="mt-2 text-red-600" onClick={() => void withdraw(r.id)}>Withdraw request</Button>}
            </li>
          ))}
        </ul>
      )}

      {el.items.some((i) => i.remaining > 0 && (i.canReturn || i.canExchange)) ? (
        <div className="mt-4">
          <Button className="rounded-full" onClick={() => { setType(canReturn ? "return" : "exchange"); reset(); setOpen(true); }}><RefreshCcw className="h-4 w-4" /> Return or exchange items</Button>
          {el.closesAt && <p className="mt-2 text-xs">Open until {new Date(el.closesAt).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}. {note}</p>}
        </div>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-sm"><PackageX className="mt-0.5 h-4 w-4 shrink-0" /> {el.message ?? "Nothing in this order can be returned or exchanged."}</p>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Return or exchange" wide>
        <div className="space-y-5">
          <div role="radiogroup" aria-label="What would you like to do?" className="grid gap-2 sm:grid-cols-2">
            {([["return", "Return for a refund", canReturn], ["exchange", "Exchange for another size", canExchange]] as const).map(([v, label, ok]) => (
              <button key={v} type="button" role="radio" aria-checked={type === v} disabled={!ok} onClick={() => { setType(v); setQty({}); setNewSize(""); }} className={cn("rounded-xl border p-3 text-left text-sm font-semibold", type === v ? "border-primary bg-primary-faint text-primary" : "border-line text-ink", !ok && "cursor-not-allowed opacity-50")}>{label}{!ok && <span className="block text-xs font-normal">Not available for these items</span>}</button>
            ))}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">{type === "exchange" ? "Which item?" : "Which items?"}</legend>
            <ul className="space-y-2">
              {usable.map((u) => {
                const it = order.items[u.index];
                const on = (qty[u.index] ?? 0) > 0;
                return (
                  <li key={u.index} className={cn("flex items-center gap-3 rounded-xl border p-3", on ? "border-primary bg-primary-faint" : "border-line")}>
                    <input type={type === "exchange" ? "radio" : "checkbox"} name="ritem" checked={on} onChange={() => toggle(u.index, u.remaining)} aria-label={`Select ${it.name}`} className="h-5 w-5 accent-primary" />
                    <ItemThumb item={it} className="h-14 w-11" />
                    <div className="min-w-0 flex-1 text-sm"><p className="line-clamp-1 font-semibold text-ink">{it.name}</p><p className="text-xs">{[it.size && `Size ${it.size}`, it.color, formatPrice(it.price)].filter(Boolean).join(" · ")}</p></div>
                    {on && type === "return" && u.remaining > 1 && (
                      <select aria-label={`Quantity of ${it.name}`} value={qty[u.index]} onChange={(e) => setQty((q) => ({ ...q, [u.index]: Number(e.target.value) }))} className="h-10 rounded-lg border border-line bg-card px-2 text-sm">
                        {Array.from({ length: u.remaining }, (_, k) => k + 1).map((n) => <option key={n}>{n}</option>)}
                      </select>
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {type === "exchange" && exchangeItem && (
            <Field label="Which size would you like instead?" hint={sizeOptions.length ? undefined : "No other size is available right now. You can return the item for a refund instead."}>
              <Select value={newSize} onChange={(e) => setNewSize(e.target.value)} aria-label="New size"><option value="">Select size</option>{sizeOptions.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}</Select>
            </Field>
          )}

          {type === "return" && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink">Where should we send your refund?</legend>
              <div className="space-y-2">
                {wallet.enabled && (
                  <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3", refundTo === "wallet" ? "border-primary bg-primary-faint" : "border-line")}>
                    <input type="radio" name="refundTo" checked={refundTo === "wallet"} onChange={() => setRefundTo("wallet")} className="mt-1 h-4 w-4 accent-primary" />
                    <span className="text-sm"><span className="font-semibold text-ink">Store wallet — instant, use it on your next order</span>{wallet.bonusPercent > 0 && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">+{wallet.bonusPercent}% extra</span>}</span>
                  </label>
                )}
                <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3", refundTo === "original" ? "border-primary bg-primary-faint" : "border-line")}>
                  <input type="radio" name="refundTo" checked={refundTo === "original"} onChange={() => setRefundTo("original")} className="mt-1 h-4 w-4 accent-primary" />
                  <span className="text-sm"><span className="font-semibold text-ink">{isCod ? "My bank account / UPI" : "Original payment method"}</span><span className="block text-xs">{isCod ? "Takes 5–7 working days after we receive the item." : "Back to the card / UPI you paid with, in 5–7 working days."}</span></span>
                </label>
                {refundTo === "original" && isCod && <Field label="UPI ID or bank details (account name, number, IFSC)"><Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={200} className="min-h-16" aria-label="Refund details" /></Field>}
              </div>
            </fieldset>
          )}

          <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason"><option value="">Select a reason</option>{reasons.map((r) => <option key={r}>{r}</option>)}</Select></Field>
          <Field label="Tell us more (optional)"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} className="min-h-20" /></Field>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Photos (optional, up to 4) — helpful for damaged or wrong items</p>
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setFiles((c) => c.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"><X className="h-3 w-3" /></button>
                </span>
              ))}
              {files.length < 4 && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-body hover:border-primary hover:text-primary">
                  <ImagePlus className="h-5 w-5" /><span className="sr-only">Add photo</span>
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { setFiles((c) => [...c, ...Array.from(e.target.files ?? [])].slice(0, 4)); e.target.value = ""; }} />
                </label>
              )}
            </div>
          </div>

          <p className="text-xs">{note}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={busy}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Submit request"}</Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}
