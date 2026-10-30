"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Printer, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Order } from "@/lib/types";
import { customerCanCancel } from "@/lib/order-flow";
import { postJson } from "@/lib/api";
import { openRazorpay, type RzpParams } from "@/lib/razorpay-client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/drawer";

export function OrderActions({ order, onlineEnabled }: { order: Order; onlineEnabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const canPay = order.status === "pending_payment" && order.payment.method === "razorpay";
  const expired = canPay && order.expiresAt && new Date(order.expiresAt) < new Date();

  const pay = async () => {
    setBusy(true);
    try {
      const { razorpay } = await postJson<{ razorpay: RzpParams }>(`/api/orders/${order.id}/pay`, {});
      await openRazorpay(razorpay, {
        onPaid: async (r) => {
          try { await postJson("/api/checkout/verify", { orderId: order.id, ...r }); toast.success("Payment successful"); router.replace(`/account/orders/${order.id}?placed=1`); router.refresh(); }
          catch (e) { toast.error("We could not confirm your payment", { description: e instanceof Error ? e.message : "Please contact us." }); }
          setBusy(false);
        },
        onDismiss: () => { toast("Payment not completed"); setBusy(false); },
        onFailed: (m) => { toast.error("Payment failed", { description: m }); setBusy(false); },
      });
    } catch (e) { toast.error("Could not start payment", { description: e instanceof Error ? e.message : "Please try again." }); setBusy(false); }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const r = await postJson<{ refunded: boolean }>(`/api/orders/${order.id}/cancel`, {});
      toast.success("Order cancelled", { description: r.refunded ? "Your refund has been started (5–7 working days)." : undefined });
      setConfirm(false);
      router.refresh();
    } catch (e) { toast.error("Could not cancel", { description: e instanceof Error ? e.message : "Please try again." }); }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      {canPay && !expired && (
        <Button size="lg" onClick={pay} disabled={busy || !onlineEnabled}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</> : "Pay now"}</Button>
      )}
      {expired && <p className="text-sm font-medium text-amber-700">The payment window has expired. This order will be cancelled automatically.</p>}
      <Button asChild variant="outline" size="lg"><Link href={`/account/orders/${order.id}/invoice`}><Printer className="h-4 w-4" /> Invoice</Link></Button>
      {customerCanCancel(order.status) && (
        <Button variant="dangerSoft" size="lg" onClick={() => setConfirm(true)}><XCircle className="h-4 w-4" /> Cancel order</Button>
      )}
      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Cancel this order?"
        footer={<><Button variant="outline" onClick={() => setConfirm(false)}>Keep order</Button><Button variant="danger" onClick={cancel} disabled={busy}>{busy ? "Cancelling…" : "Yes, cancel"}</Button></>}>
        <p className="text-sm">{order.payment.status === "paid" ? "Your payment will be refunded to the original payment method in 5–7 working days." : "No payment has been taken for this order."}</p>
      </Dialog>
    </div>
  );
}

export function PrintButton() {
  return <Button onClick={() => window.print()} className="print:hidden"><Printer className="h-4 w-4" /> Print / Save as PDF</Button>;
}
