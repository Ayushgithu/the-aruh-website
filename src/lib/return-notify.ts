import { after } from "next/server";
import { sendEmail } from "./email";
import type { ReturnRequest } from "./types";

const STORE = process.env.NEXT_PUBLIC_BRAND_NAME || "The Aaruh";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export type ReturnEmailKind = "requested" | "approved" | "rejected" | "received" | "refunded" | "exchange_shipped";

export function returnEmailContent(kind: ReturnEmailKind, r: ReturnRequest) {
  const what = r.type === "exchange" ? "exchange" : "return";
  const head: Record<ReturnEmailKind, [string, string]> = {
    requested: [`We received your ${what} request ${r.number}`, `We have received your ${what} request for order ${r.orderNumber}. We will review it and get back to you shortly.`],
    approved: [`Your ${what} request ${r.number} is approved`, `Good news — your ${what} request was approved.${r.pickup?.awb ? ` A pickup is arranged (tracking ${r.pickup.awb}).` : " We will arrange the pickup and share the details."} Please keep the items unworn with tags, in their packaging.`],
    rejected: [`Update on your ${what} request ${r.number}`, `We are sorry — we could not approve this ${what} request.${r.adminNote ? ` Reason: ${r.adminNote}` : ""} Please reply to this email or message us if you would like to discuss it.`],
    received: [`We received your returned item (${r.number})`, `Your returned item has reached us.${r.type === "exchange" ? " We are preparing your replacement." : " We will issue your refund shortly."}`],
    refunded: [r.refund?.method === "wallet" ? `Your refund ${r.number} is in your wallet` : `Your refund for ${r.number} is on its way`, r.refund?.method === "wallet" ? `We have added ${inr((r.refund.amount ?? 0) + (r.refund.bonus ?? 0))} to your store wallet${r.refund.bonus ? ` (includes ${inr(r.refund.bonus)} bonus)` : ""}. It is applied automatically when you check out next.` : `We have refunded ${r.refund ? inr(r.refund.amount) : "your amount"}${r.refund?.method === "razorpay" ? " to your original payment method. It usually takes 5–7 working days to show in your account." : `.${r.refund?.note ? ` ${r.refund.note}` : ""}`}`],
    exchange_shipped: [`Your replacement for ${r.number} is on the way`, `We have shipped your replacement${r.exchangeShipment?.awb ? ` (tracking ${r.exchangeShipment.awb})` : ""}.`],
  };
  const [subject, body] = head[kind];
  const items = r.items.map((i) => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ""}`).join(", ");
  const link = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/account/orders/${r.orderId}`;
  const text = `Hi ${r.customer.name},\n\n${body}\n\nItems: ${items}\n\nView your order: ${link}\n\n— ${STORE}`;
  const html = `<!doctype html><html><body style="margin:0;background:#fbf6f1;font-family:Inter,Arial,sans-serif;color:#28181d"><table role="presentation" width="100%"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="520" style="max-width:520px;background:#fff;border:1px solid #eaded6;border-radius:16px"><tr><td style="padding:28px">
<p style="margin:0 0 4px;font-size:20px;font-weight:700;font-family:Georgia,serif">${esc(STORE)}</p><h1 style="margin:18px 0 8px;font-size:19px">${esc(subject)}</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#6a555c">Hi ${esc(r.customer.name)}, ${esc(body)}</p>
<p style="margin:0 0 18px;font-size:14px;color:#6a555c"><strong style="color:#28181d">Items:</strong> ${esc(items)}</p>
<a href="${link}" style="display:inline-block;background:#8c1d40;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px">View my order</a></td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}

/** Emails the customer after the response has been sent. A failed email never fails the request. */
export function notifyReturn(kind: ReturnEmailKind, r: ReturnRequest) {
  if (!r.customer.email || r.customer.email.endsWith("@guest.invalid")) return;
  after(async () => {
    try { await sendEmail({ to: r.customer.email, ...returnEmailContent(kind, r) }); }
    catch (e) { console.error("[return-email] failed:", e instanceof Error ? e.message : e); }
  });
}
