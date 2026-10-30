import { Resend } from "resend";

/* Transactional email through Resend (https://resend.com). */
const STORE = process.env.NEXT_PUBLIC_BRAND_NAME || "The Aaruh";

export const emailFrom = () => process.env.EMAIL_FROM || `${STORE} <onboarding@resend.dev>`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function resetEmailContent(name: string, link: string, audience: "admin" | "customer" = "admin") {
  const who = audience === "admin" ? "admin password" : "password";
  const subject = `Reset your ${STORE} ${who}`;
  const text = `Hi ${name},\n\nWe received a request to reset your ${STORE} ${who}.\nOpen this link to choose a new one (valid for 1 hour):\n\n${link}\n\nIf you did not ask for this, you can ignore this email — your password stays the same.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
      <tr><td style="padding:32px">
        <p style="margin:0 0 4px;font-size:18px;font-weight:800">${STORE}</p>
        <h1 style="margin:20px 0 8px;font-size:20px">Reset your password</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569">Hi ${esc(name)}, we received a request to reset your ${who}. This link is valid for 1 hour and can be used once.</p>
        <p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;background:#8c1d40;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">Choose a new password</a></p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${esc(link)}</span></p>
        <p style="margin:20px 0 0;font-size:13px;color:#64748b">Did not request this? Ignore this email — your password will not change.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { subject, text, html };
}

/** Sends the reset link. Throws if Resend rejects it. Returns false if email is not configured. */
export async function sendPasswordResetEmail({ to, name, link }: { to: string; name: string; link: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Local development convenience: no API key yet, so print the link in the server terminal.
    if (process.env.NODE_ENV !== "production") console.warn(`\n[email] RESEND_API_KEY is not set. Password reset link for ${to}:\n${link}\n`);
    else console.error("[email] RESEND_API_KEY is not set; password reset email was not sent.");
    return false;
  }
  const { subject, text, html } = resetEmailContent(name, link);
  const { error } = await new Resend(key).emails.send({ from: emailFrom(), to, subject, text, html });
  if (error) throw new Error(`Resend: ${error.message}`);
  return true;
}

/* ---------------------------------- Generic + order emails ---------------------------------- */
export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") console.warn(`\n[email] RESEND_API_KEY is not set. Email to ${to} not sent:\n${subject}\n`);
    return false;
  }
  const { error } = await new Resend(key).emails.send({ from: emailFrom(), to, subject, text, html });
  if (error) throw new Error(`Resend: ${error.message}`);
  return true;
}

export const sendCustomerResetEmail = ({ to, name, link }: { to: string; name: string; link: string }) => {
  const { subject, text, html } = resetEmailContent(name, link, "customer");
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production") console.warn(`\n[email] Password reset link for ${to}:\n${link}\n`);
  return sendEmail({ to, subject, text, html });
};

export function verificationEmailContent(name: string, code: string) {
  const subject = `${code} is your ${STORE} verification code`;
  const text = `Hi ${name},\n\nYour ${STORE} verification code is: ${code}\n\nIt is valid for 10 minutes. If you did not create an account, you can ignore this email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
      <tr><td style="padding:32px">
        <p style="margin:0 0 4px;font-size:18px;font-weight:800">${STORE}</p>
        <h1 style="margin:20px 0 8px;font-size:20px">Verify your email</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569">Hi ${esc(name)}, enter this code to finish creating your account. It is valid for 10 minutes.</p>
        <p style="margin:0 0 24px;text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;color:#8c1d40">${esc(code)}</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">Did not sign up? Ignore this email and nothing will happen.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { subject, text, html };
}

/** Emails the sign-up code. Throws if it could not be delivered, so the customer is never left waiting for a mail that will not come. */
export async function sendVerificationEmail({ to, name, code }: { to: string; name: string; code: string }) {
  const { subject, text, html } = verificationEmailContent(name, code);
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV !== "production") { console.warn(`\n[email] RESEND_API_KEY is not set. Verification code for ${to}: ${code}\n`); return true; }
    throw new Error("RESEND_API_KEY is not set; verification email was not sent.");
  }
  return sendEmail({ to, subject, text, html });
}

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export type OrderEmailKind = "placed" | "paid" | "shipped" | "delivered" | "cancelled";
interface EmailOrder {
  orderNumber: string; total: number; shipping: number; subtotal: number; status: string;
  customer: { name: string; email: string };
  items: { name: string; quantity: number; price: number }[];
  payment: { method: string; status: string };
  tracking?: { carrier: string; number: string };
}

export function orderEmailContent(kind: OrderEmailKind, o: EmailOrder, link: string) {
  const heading = {
    placed: "We received your order",
    paid: "Payment received — order confirmed",
    shipped: "Your order is on its way",
    delivered: "Your order was delivered",
    cancelled: "Your order was cancelled",
  }[kind];
  const intro = {
    placed: o.payment.method === "cod" ? "Thanks for ordering! You will pay in cash when it arrives." : "Thanks for your order!",
    paid: "Thank you! We have received your payment and will pack your order shortly.",
    shipped: o.tracking ? `Shipped via ${o.tracking.carrier || "courier"}. Tracking number: ${o.tracking.number}.` : "It has been handed to the courier.",
    delivered: "We hope you enjoy it. If anything is not right, reply to this email or message us on WhatsApp.",
    cancelled: o.payment.status === "refunded" ? "Your payment has been refunded to the original payment method (it can take 5–7 working days to show up)." : "No payment is pending for this order.",
  }[kind];
  const lines = o.items.map((i) => `${i.quantity} x ${i.name} - ${inr(i.price * i.quantity)}`).join("\n");
  const subject = `${heading} (${o.orderNumber})`;
  const text = `Hi ${o.customer.name},\n\n${intro}\n\nOrder ${o.orderNumber}\n${lines}\nDelivery: ${o.shipping ? inr(o.shipping) : "Free"}\nTotal: ${inr(o.total)}\n\nView your order: ${link}`;
  const rows = o.items.map((i) => `<tr><td style="padding:6px 0;font-size:14px">${i.quantity} × ${esc(i.name)}</td><td align="right" style="padding:6px 0;font-size:14px">${inr(i.price * i.quantity)}</td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:16px"><tr><td style="padding:32px">
    <p style="margin:0 0 4px;font-size:18px;font-weight:800">${STORE}</p>
    <h1 style="margin:20px 0 8px;font-size:20px">${heading}</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569">Hi ${esc(o.customer.name)}, ${esc(intro)}</p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b">Order ${esc(o.orderNumber)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">${rows}
      <tr><td style="padding:6px 0;font-size:14px;color:#64748b">Delivery</td><td align="right" style="font-size:14px;color:#64748b">${o.shipping ? inr(o.shipping) : "Free"}</td></tr>
      <tr><td style="padding:8px 0;font-size:15px;font-weight:700">Total</td><td align="right" style="font-size:15px;font-weight:700">${inr(o.total)}</td></tr></table>
    <p style="margin:24px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#8c1d40;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">View your order</a></p>
  </td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}

export async function sendOrderEmail(kind: OrderEmailKind, order: EmailOrder, orderId: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const { subject, text, html } = orderEmailContent(kind, order, `${base}/account/orders/${orderId}`);
  return sendEmail({ to: order.customer.email, subject, text, html });
}
