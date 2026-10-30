/* Browser side of Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/). */
export interface RazorpayParams {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
}
export interface RazorpaySuccess { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: new (options: Record<string, any>) => { open: () => void; on: (event: string, cb: (r: unknown) => void) => void };
  }
}

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export type RzpParams = RazorpayParams;

export interface RazorpayHandlers {
  /** The customer paid. Send the proof to /api/checkout/verify — only the server can confirm it. */
  onPaid: (proof: RazorpaySuccess) => void | Promise<void>;
  /** The customer closed the window without paying. */
  onDismiss: () => void | Promise<void>;
  /** Razorpay reported a failed attempt (card declined, etc.). */
  onFailed: (message: string) => void;
}

/** Opens the payment window and reports what happens through the handlers. Throws if the script cannot load. */
export async function openRazorpay(p: RzpParams, h: RazorpayHandlers, opts: { upiFirst?: boolean } = {}): Promise<void> {
  if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("Could not load the payment window. Check your internet connection and try again.");
  const rzp = new window.Razorpay({
    key: p.keyId,
    amount: p.amount,
    currency: p.currency,
    name: process.env.NEXT_PUBLIC_BRAND_NAME || "The Aaruh",
    description: p.description,
    order_id: p.orderId,
    prefill: p.prefill,
    theme: { color: "#8C1D40" },
    // "Pay with GPay / PhonePe / Paytm": show the UPI block first (on phones it opens the UPI app directly)
    ...(opts.upiFirst ? { config: { display: { blocks: { upi: { name: "Pay with UPI (GPay, PhonePe, Paytm)", instruments: [{ method: "upi" }] }, other: { name: "Cards, netbanking & wallets", instruments: [{ method: "card" }, { method: "netbanking" }, { method: "wallet" }] } }, sequence: ["block.upi", "block.other"], preferences: { show_default_blocks: false } } } } : {}),
    handler: (r: RazorpaySuccess) => { void h.onPaid(r); },
    modal: { ondismiss: () => { void h.onDismiss(); } },
  });
  rzp.on("payment.failed", (r: unknown) => {
    h.onFailed((r as { error?: { description?: string } })?.error?.description || "The payment failed. You have not been charged — please try again.");
  });
  rzp.open();
}
