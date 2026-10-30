import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */
const rz = vi.hoisted(() => ({ handlers: null as any, params: null as any }));
vi.mock("@/lib/razorpay-client", () => ({
  openRazorpay: vi.fn(async (params: unknown, handlers: unknown) => { rz.params = params; rz.handlers = handlers; }),
}));

import { CustomerProvider } from "@/hooks/use-customer";
import { CartView } from "@/components/site/cart-view";
import { CheckoutView } from "@/components/site/checkout-view";
import { COD_MAX } from "@/lib/pricing";
import { customer, makeLine, makeProduct } from "../fixtures";
import { routeFetch, sentBody } from "../helpers";
import { router } from "../mocks";

const me = (over: Record<string, unknown> = {}) => ({ body: { user: customer, cart: [], wishlist: [], address: null, ...over } });
const signedOut = { "GET /api/auth/me": () => ({ body: { user: null, cart: [], wishlist: [], address: null } }) };
const wrap = (ui: React.ReactElement) => render(<CustomerProvider>{ui}</CustomerProvider>);

beforeEach(() => { Object.values(router).forEach((f) => f.mockClear()); rz.handlers = null; rz.params = null; });

describe("<CartView />", () => {
  it("asks signed-out visitors to sign in, and opens the popup", async () => {
    routeFetch(signedOut);
    const user = userEvent.setup();
    wrap(<CartView />);
    expect(await screen.findByText("Sign in to see your bag")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign in / Create account" }));
    expect(await screen.findByRole("dialog", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows a friendly empty state", async () => {
    routeFetch({ "GET /api/auth/me": () => me() });
    wrap(<CartView />);
    expect(await screen.findByText("Your bag is empty")).toBeInTheDocument();
  });

  it("lists items with totals; delivery is free above the threshold", async () => {
    routeFetch({ "GET /api/auth/me": () => me({ cart: [makeLine({ quantity: 2 })] }) });
    wrap(<CartView />);
    const items = await screen.findByRole("list", { name: "Bag items" });
    expect(within(items).getByText("Dell Latitude 5420")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getAllByText("₹65,998").length).toBeGreaterThan(0); // 2 × 32,999
    expect(screen.getByRole("link", { name: "Proceed to checkout" })).toHaveAttribute("href", "/checkout");
  });

  it("small orders pay the delivery fee", async () => {
    routeFetch({ "GET /api/auth/me": () => me({ cart: [makeLine({ type: "accessory", price: 599, name: "Mouse" })] }) });
    wrap(<CartView />);
    await screen.findByText("Mouse");
    expect(screen.getAllByText("₹79").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₹678").length).toBeGreaterThan(0);
  });

  it("changing the quantity updates the server cart", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "GET /api/auth/me": () => me({ cart: [makeLine()] }),
      "PATCH /api/cart/64b7f0c2a1b2c3d4e5f60001": () => ({ body: { cart: [makeLine({ quantity: 2 })] } }),
    });
    wrap(<CartView />);
    await user.click(await screen.findByRole("button", { name: "Increase quantity of Dell Latitude 5420" }));
    await waitFor(() => expect(screen.getAllByText("₹65,998").length).toBeGreaterThan(0));
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes("/api/cart/"))!;
    expect(call[1]?.method).toBe("PATCH");
    expect(JSON.parse(String(call[1]?.body))).toEqual({ quantity: 2 });
  });

  it("removing an item deletes it on the server and from the page", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({
      "GET /api/auth/me": () => me({ cart: [makeLine()] }),
      "DELETE /api/cart/64b7f0c2a1b2c3d4e5f60001": () => ({ body: { cart: [] } }),
    });
    wrap(<CartView />);
    await user.click(await screen.findByRole("button", { name: "Remove Dell Latitude 5420 from bag" }));
    expect(await screen.findByText("Your bag is empty")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "DELETE")).toBe(true);
  });

  it("blocks checkout when an item is no longer available in that quantity", async () => {
    routeFetch({ "GET /api/auth/me": () => me({ cart: [makeLine({ quantity: 3, available: 1 })] }) });
    wrap(<CartView />);
    expect(await screen.findByRole("button", { name: "Fix your bag to continue" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: "Proceed to checkout" })).not.toBeInTheDocument();
  });
});

describe("<CheckoutView /> (payment page)", () => {
  const saved = { name: "Ravi Kumar", phone: "9876543210", line1: "12 MG Road, Camp", line2: "", city: "Pune", state: "Maharashtra", pincode: "411001" };
  const order = { id: "64b7f0c2a1b2c3d4e5f6beef", orderNumber: "LC-251001-ABC123", total: 32999, status: "placed" };
  const base = (extra: Record<string, any> = {}) => ({ "GET /api/auth/me": () => me({ cart: [makeLine()] }), ...extra });
  const submit = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => user.click(await screen.findByRole("button", { name }));

  it("signed-out visitors are sent to shop first (guest checkout starts when they add to the bag)", async () => {
    routeFetch(signedOut);
    wrap(<CheckoutView saved={null} onlineEnabled />);
    expect(await screen.findByText("Your bag is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start shopping" })).toBeInTheDocument();
  });

  it("shows 'nothing to check out' for an empty cart", async () => {
    routeFetch({ "GET /api/auth/me": () => me() });
    wrap(<CheckoutView saved={null} onlineEnabled />);
    expect(await screen.findByText("Nothing to check out")).toBeInTheDocument();
  });

  it("validates the address before anything is sent", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch(base());
    wrap(<CheckoutView saved={null} onlineEnabled />);
    await submit(user, /^Pay /);
    expect(await screen.findByText("Enter a valid 6-digit pincode")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/api/checkout"))).toBe(false);
  });

  it("defaults to online payment, prefills the saved address and shows the amount on the button", async () => {
    routeFetch(base());
    wrap(<CheckoutView saved={saved} onlineEnabled />);
    expect(await screen.findByRole("button", { name: "Pay ₹32,999" })).toBeInTheDocument();
    expect(screen.getByLabelText("City")).toHaveValue("Pune");
    expect(screen.getByLabelText("Pincode")).toHaveValue("411001");
  });

  it("Cash on Delivery: places the order and opens its page", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch(base({ "POST /api/checkout": () => ({ status: 201, body: { order } }) }));
    wrap(<CheckoutView saved={saved} onlineEnabled />);
    await user.click(await screen.findByRole("radio", { name: /Cash on Delivery/ }));
    await submit(user, /Place order/);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/account/orders/${order.id}?placed=1`));
    const call = fetchMock.mock.calls.find((c) => String(c[0]) === "/api/checkout")!;
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({ method: "cod", address: { pincode: "411001", city: "Pune" } });
  });

  it("online: opens Razorpay with the server's order, then verifies the payment on the server", async () => {
    const user = userEvent.setup();
    const params = { keyId: "rzp_test_abc", orderId: "order_RZP", amount: 3299900, currency: "INR", description: "Order LC-1", prefill: {} };
    const fetchMock = routeFetch(base({
      "POST /api/checkout": () => ({ status: 201, body: { order: { ...order, status: "pending_payment" }, razorpay: params } }),
      "POST /api/checkout/verify": () => ({ body: { ok: true } }),
    }));
    wrap(<CheckoutView saved={saved} onlineEnabled />);
    await submit(user, /^Pay /);
    await waitFor(() => expect(rz.handlers).not.toBeNull());
    expect(rz.params).toMatchObject({ orderId: "order_RZP", amount: 3299900 });

    const proof = { razorpay_order_id: "order_RZP", razorpay_payment_id: "pay_1", razorpay_signature: "sig_abcdefghij" };
    await rz.handlers.onPaid(proof);
    const verify = fetchMock.mock.calls.find((c) => String(c[0]) === "/api/checkout/verify")!;
    expect(JSON.parse(String(verify[1]?.body))).toEqual({ orderId: order.id, ...proof });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/account/orders/${order.id}?placed=1`));
    expect(toast.success).toHaveBeenCalledWith("Payment successful", expect.anything());
  });

  it("online: closing the payment window keeps the order and explains how to pay later", async () => {
    const user = userEvent.setup();
    routeFetch(base({ "POST /api/checkout": () => ({ status: 201, body: { order: { ...order, status: "pending_payment" }, razorpay: { keyId: "k", orderId: "order_RZP", amount: 1, currency: "INR", description: "", prefill: {} } } }) }));
    wrap(<CheckoutView saved={saved} onlineEnabled />);
    await submit(user, /^Pay /);
    await waitFor(() => expect(rz.handlers).not.toBeNull());
    await rz.handlers.onDismiss();
    expect(toast).toHaveBeenCalledWith("Payment not completed", expect.objectContaining({ description: expect.stringContaining("30 minutes") }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/account/orders/${order.id}`));
  });

  it("online: a failed attempt (card declined) shows the reason and lets the customer retry", async () => {
    const user = userEvent.setup();
    routeFetch(base({ "POST /api/checkout": () => ({ status: 201, body: { order: { ...order, status: "pending_payment" }, razorpay: { keyId: "k", orderId: "order_RZP", amount: 1, currency: "INR", description: "", prefill: {} } } }) }));
    wrap(<CheckoutView saved={saved} onlineEnabled />);
    await submit(user, /^Pay /);
    await waitFor(() => expect(rz.handlers).not.toBeNull());
    rz.handlers.onFailed("Card declined by the bank");
    expect(toast.error).toHaveBeenCalledWith("Payment failed", { description: "Card declined by the bank" });
    await waitFor(() => expect(screen.getByRole("button", { name: /^Pay / })).toBeEnabled());
  });

  it("if the payment could not be confirmed, the customer is sent to the order page, not left guessing", async () => {
    const user = userEvent.setup();
    routeFetch(base({
      "POST /api/checkout": () => ({ status: 201, body: { order: { ...order, status: "pending_payment" }, razorpay: { keyId: "k", orderId: "order_RZP", amount: 1, currency: "INR", description: "", prefill: {} } } }),
      "POST /api/checkout/verify": () => ({ status: 400, body: { error: "Payment verification failed." } }),
    }));
    wrap(<CheckoutView saved={saved} onlineEnabled />);
    await submit(user, /^Pay /);
    await waitFor(() => expect(rz.handlers).not.toBeNull());
    await rz.handlers.onPaid({ razorpay_order_id: "order_RZP", razorpay_payment_id: "pay_1", razorpay_signature: "sig_abcdefghij" });
    expect(toast.error).toHaveBeenCalledWith("We could not confirm your payment", { description: "Payment verification failed." });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/account/orders/${order.id}`));
  });

  it("when online payment is not set up, only Cash on Delivery can be chosen", async () => {
    routeFetch(base());
    wrap(<CheckoutView saved={saved} onlineEnabled={false} />);
    expect(await screen.findByRole("radio", { name: /Pay online/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Cash on Delivery/ })).toBeChecked();
    expect(screen.getByText("Online payment is not available right now.")).toBeInTheDocument();
  });

  it("Cash on Delivery is disabled above the limit", async () => {
    routeFetch({ "GET /api/auth/me": () => me({ cart: [makeLine({ price: COD_MAX + 1000 })] }) });
    wrap(<CheckoutView saved={saved} onlineEnabled />);
    expect(await screen.findByRole("radio", { name: /Cash on Delivery/ })).toBeDisabled();
  });

  it("an unavailable item sends the customer back to the cart", async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch({ "GET /api/auth/me": () => me({ cart: [makeLine({ quantity: 2, available: 1 })] }) });
    wrap(<CheckoutView saved={saved} onlineEnabled />);
    await submit(user, /^Pay /);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/cart"));
    expect(fetchMock.mock.calls.some((c) => String(c[0]) === "/api/checkout")).toBe(false);
  });

  it("shows server errors such as 'item just sold out'", async () => {
    const user = userEvent.setup();
    routeFetch(base({ "POST /api/checkout": () => ({ status: 409, body: { error: 'Sorry, "Dell Latitude 5420" is no longer available.' } }) }));
    wrap(<CheckoutView saved={saved} onlineEnabled />);
    await user.click(await screen.findByRole("radio", { name: /Cash on Delivery/ }));
    await submit(user, /Place order/);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not place your order", { description: 'Sorry, "Dell Latitude 5420" is no longer available.' }));
    expect(router.push).not.toHaveBeenCalledWith(expect.stringContaining("/account/orders"));
  });
});
