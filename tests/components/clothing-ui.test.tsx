import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { CustomerProvider } from "@/hooks/use-customer";
import { PurchasePanel } from "@/components/site/purchase-panel";
import { ProductCard } from "@/components/site/product-card";
import { ShopView } from "@/components/site/shop-view";
import { customer, makeProduct } from "../fixtures";
import { routeFetch, sentBody } from "../helpers";
import { router } from "../mocks";

vi.mock("next/navigation", async () => {
  const m = await import("../mocks");
  return { useRouter: () => m.router, usePathname: () => "/shop", useSearchParams: () => new URLSearchParams() };
});

const dress = makeProduct({
  type: "clothing", name: "Maroon Anarkali Suit", brand: "", category: "Suit Sets", price: 2499, mrp: 3499,
  art: { kind: "cloth", tone: "silver", hue: 340 },
  sizes: [{ label: "S", qty: 0 }, { label: "M", qty: 2 }, { label: "L", qty: 5 }],
  colors: [{ name: "Maroon", hex: "#8c1d40" }, { name: "Green", hex: "#166534" }],
});
const me = { body: { user: customer, cart: [], wishlist: [], address: null } };
const wrap = (ui: React.ReactElement) => render(<CustomerProvider>{ui}</CustomerProvider>);

beforeEach(() => { Object.values(router).forEach((f) => f.mockClear()); vi.mocked(toast).mockClear?.(); });

describe("<PurchasePanel /> (clothing)", () => {
  it("won't add to the bag until a size is chosen", async () => {
    const fetchMock = routeFetch({ "GET /api/auth/me": () => me });
    const user = userEvent.setup();
    wrap(<PurchasePanel product={dress} />);
    await user.click(screen.getAllByRole("button", { name: /Add to bag/ })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Please select a size");
    expect(fetchMock.mock.calls.some((c) => String(c[0]) === "/api/cart")).toBe(false);
  });

  it("sold-out sizes are disabled", () => {
    routeFetch({ "GET /api/auth/me": () => me });
    wrap(<PurchasePanel product={dress} />);
    expect(screen.getByRole("radio", { name: "Size S, sold out" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Size M" })).toBeEnabled();
  });

  it("adds the chosen size and colour", async () => {
    const fetchMock = routeFetch({ "GET /api/auth/me": () => me, "POST /api/cart": () => ({ body: { cart: [] } }) });
    const user = userEvent.setup();
    wrap(<PurchasePanel product={dress} />);
    await user.click(screen.getByRole("radio", { name: "Size L" }));
    await user.click(screen.getByRole("radio", { name: "Green" }));
    await user.click(screen.getAllByRole("button", { name: /Add to bag/ })[0]);
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => String(c[0]) === "/api/cart")).toBe(true));
    const call = fetchMock.mock.calls.find((c) => String(c[0]) === "/api/cart")!;
    expect(JSON.parse(String(call[1]?.body))).toEqual({ productId: dress.id, quantity: 1, size: "L", color: "Green" });
  });

  it("warns when only a few are left in the chosen size", async () => {
    routeFetch({ "GET /api/auth/me": () => me });
    const user = userEvent.setup();
    wrap(<PurchasePanel product={dress} />);
    await user.click(screen.getByRole("radio", { name: "Size M" }));
    expect(screen.getByText(/Only 2 left in size M/)).toBeInTheDocument();
  });
});

describe("<ProductCard /> (clothing)", () => {
  it("shows the discount, price and a quick-add that opens size choice", async () => {
    routeFetch({ "GET /api/auth/me": () => me });
    const user = userEvent.setup();
    wrap(<ProductCard product={dress} />);
    expect(screen.getByText("-29%")).toBeInTheDocument();
    expect(screen.getByText("₹2,499")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quick add Maroon Anarkali Suit" }));
    expect(await screen.findByRole("dialog", { name: "Maroon Anarkali Suit" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Size L" })).toBeInTheDocument();
  });
});

describe("<ShopView />", () => {
  const list = [
    dress,
    makeProduct({ id: "64b7f0c2a1b2c3d4e5f60002", slug: "saree", type: "clothing", name: "Silk Saree", category: "Sarees", price: 4999, mrp: undefined, art: { kind: "cloth", tone: "silver", hue: 20 }, sizes: [{ label: "Free Size", qty: 3 }], featured: false, views: 1 }),
    makeProduct({ id: "64b7f0c2a1b2c3d4e5f60003", slug: "coord", type: "clothing", name: "Cotton Co-ord", category: "Co-ord Sets", price: 999, mrp: undefined, art: { kind: "cloth", tone: "silver", hue: 160 }, sizes: [{ label: "M", qty: 0 }], featured: false, views: 1 }),
  ];
  it("filters by collection, size and stock, and sorts by price", async () => {
    routeFetch({ "GET /api/auth/me": () => me });
    const user = userEvent.setup();
    wrap(<ShopView products={list} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sarees" }));
    expect(screen.queryByText("Maroon Anarkali Suit")).not.toBeInTheDocument();
    expect(screen.getByText("Silk Saree")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All" }));
    await user.click(screen.getByRole("button", { name: "M", pressed: false }));
    expect(screen.queryByText("Cotton Co-ord")).not.toBeInTheDocument(); // its only M is sold out
    await user.selectOptions(screen.getByLabelText("Sort by"), "price-desc");
    const names = [...document.querySelectorAll("article h3")].map((h) => h.textContent);
    expect(names).toEqual(["Maroon Anarkali Suit"]);
  });
});
