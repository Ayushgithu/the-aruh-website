import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchDialog } from "@/components/site/search-dialog";
import { routeFetch } from "../helpers";
import { router } from "../mocks";

const hit = (n: number, name: string, slug: string) => ({ id: `id${n}`, slug, name, brand: "Dell", price: 32999, type: "laptop", stock: "in-stock", art: { kind: "laptop", tone: "silver", hue: 200 } });
const input = () => screen.getByRole("combobox", { name: "Search products" });

beforeEach(() => { Object.values(router).forEach((f) => f.mockClear()); localStorage.clear(); });

describe("<SearchDialog /> (fuzzy live search)", () => {
  it("shows hints before typing and does not search for 1 character", async () => {
    const fetchMock = routeFetch({});
    const user = userEvent.setup();
    render(<SearchDialog open onClose={vi.fn()} />);
    expect(screen.getByText(/Try “anarkali”/)).toBeInTheDocument();
    await user.type(input(), "d");
    await new Promise((r) => setTimeout(r, 300));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists matches (typo-tolerant search happens on the server) with price", async () => {
    const fetchMock = routeFetch({ "GET /api/search": () => ({ body: { results: [hit(1, "Dell Latitude 5420", "dell-latitude-5420"), hit(2, "Dell Inspiron 14", "dell-inspiron-14")] } }) });
    const user = userEvent.setup();
    render(<SearchDialog open onClose={vi.fn()} />);
    await user.type(input(), "latitde");
    expect(await screen.findByRole("option", { name: /Dell Latitude 5420/ })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(screen.getAllByText("₹32,999").length).toBeGreaterThan(0);
    expect(String(fetchMock.mock.calls.at(-1)![0])).toBe("/api/search?q=latitde");
  });

  it("debounces: fast typing makes one request, not one per letter", async () => {
    const fetchMock = routeFetch({ "GET /api/search": () => ({ body: { results: [] } }) });
    const user = userEvent.setup();
    render(<SearchDialog open onClose={vi.fn()} />);
    await user.type(input(), "macbook");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 250));
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
    expect(String(fetchMock.mock.calls.at(-1)![0])).toBe("/api/search?q=macbook");
  });

  it("arrow keys + Enter open the highlighted product", async () => {
    routeFetch({ "GET /api/search": () => ({ body: { results: [hit(1, "Dell Latitude 5420", "dell-latitude-5420"), hit(2, "Dell Inspiron 14", "dell-inspiron-14")] } }) });
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SearchDialog open onClose={onClose} />);
    await user.type(input(), "dell");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(router.push).toHaveBeenCalledWith("/product/dell-inspiron-14");
    expect(onClose).toHaveBeenCalled();
  });

  it("Enter with nothing highlighted opens the full results page", async () => {
    routeFetch({ "GET /api/search": () => ({ body: { results: [hit(1, "Dell Latitude 5420", "dell-latitude-5420")] } }) });
    const user = userEvent.setup();
    render(<SearchDialog open onClose={vi.fn()} />);
    await user.type(input(), "dell i5");
    await screen.findAllByRole("option");
    await user.keyboard("{Enter}");
    expect(router.push).toHaveBeenCalledWith("/search?q=dell%20i5");
  });

  it("explains when nothing matches and offers help", async () => {
    routeFetch({ "GET /api/search": () => ({ body: { results: [] } }) });
    const user = userEvent.setup();
    render(<SearchDialog open onClose={vi.fn()} />);
    await user.type(input(), "zzzzqq");
    expect(await screen.findByText("No matches for “zzzzqq”")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ask us/i })).toHaveAttribute("href", "/contact");
  });

  it("remembers recent searches", async () => {
    routeFetch({ "GET /api/search": () => ({ body: { results: [hit(1, "Dell Latitude 5420", "dell-latitude-5420")] } }) });
    const user = userEvent.setup();
    const { unmount } = render(<SearchDialog open onClose={vi.fn()} />);
    await user.type(input(), "dell");
    await screen.findAllByRole("option");
    await user.keyboard("{Enter}");
    unmount();
    render(<SearchDialog open onClose={vi.fn()} />);
    expect(await screen.findByText("Recent searches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dell/i })).toBeInTheDocument();
  });

  it("Escape closes it", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SearchDialog open onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
