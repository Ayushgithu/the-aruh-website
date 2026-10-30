"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Address, CartLine, CustomerUser } from "@/lib/types";
import { ApiError, postJson, request } from "@/lib/api";
import { CustomerAuthModal, type CustomerAuthMode } from "@/components/site/customer-auth-modal";
import { useRules } from "./use-rules";

/** Which size / colour of a product. */
export interface Variant { size?: string; color?: string }
export type LineRef = { productId: string } & Variant;

interface AuthOptions { next?: string; then?: () => void | Promise<void> }

interface Ctx {
  user: CustomerUser | null;
  /** false until the first /api/auth/me answer arrives */
  ready: boolean;
  cart: CartLine[];
  cartCount: number;
  wishlist: string[];
  address: Address | null;
  openAuth: (mode?: CustomerAuthMode, opts?: AuthOptions) => void;
  addToCart: (product: { id: string; name: string }, quantity?: number, variant?: Variant) => Promise<boolean>;
  setQuantity: (line: LineRef, quantity: number) => Promise<void>;
  removeFromCart: (line: LineRef) => Promise<void>;
  /** Accepts a product id, or { id, name } to include the name in the confirmation toast. */
  toggleWishlist: (product: string | { id: string; name: string }) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const CustomerContext = React.createContext<Ctx | null>(null);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const rules = useRules();
  const guestOk = React.useRef(rules.guestCheckout);
  guestOk.current = rules.guestCheckout;
  const [state, setState] = React.useState<{ user: CustomerUser | null; ready: boolean; cart: CartLine[]; wishlist: string[]; address: Address | null }>({ user: null, ready: false, cart: [], wishlist: [], address: null });
  const [modal, setModal] = React.useState<{ mode: CustomerAuthMode; token?: string; email?: string } | null>(null);
  const pending = React.useRef<AuthOptions>({});
  // Always-current copies, so an action queued before sign-in (e.g. "add to cart") sees the new user the moment login finishes,
  // without waiting for React to re-render.
  const userRef = React.useRef<CustomerUser | null>(null);
  const wishlistRef = React.useRef<string[]>([]);
  userRef.current = state.user;
  wishlistRef.current = state.wishlist;

  const refresh = React.useCallback(async () => {
    try {
      const d = await request<{ user: CustomerUser | null; cart: CartLine[]; wishlist: string[]; address: Address | null }>("/api/auth/me", { cache: "no-store" });
      userRef.current = d.user;
      wishlistRef.current = d.wishlist ?? [];
      setState({ user: d.user, ready: true, cart: d.cart ?? [], wishlist: d.wishlist ?? [], address: d.address ?? null });
    } catch {
      setState((s) => ({ ...s, ready: true }));
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  // Deep links: /?auth=login&next=/account/orders (protected pages) and /?auth=reset&token=…&email=… (from the email).
  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const m = q.get("auth");
    if (!m) return;
    const token = q.get("token") ?? undefined;
    const email = q.get("email") ?? undefined;
    const next = q.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) pending.current = { next };
    if (m === "reset" && token && email) setModal({ mode: "reset", token, email });
    else if (m === "login" || m === "register" || m === "forgot") setModal({ mode: m });
    ["auth", "token", "email", "next"].forEach((k) => q.delete(k)); // keep the secret token out of the address bar / history
    const rest = q.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, []);

  const openAuth = React.useCallback((mode: CustomerAuthMode = "login", opts: AuthOptions = {}) => {
    pending.current = opts;
    setModal({ mode });
  }, []);

  /** "Continue as guest": a quiet throw-away account so the bag and checkout work without signing up. */
  const startGuest = React.useCallback(async () => {
    try { await postJson("/api/auth/guest", {}); await refresh(); return !!userRef.current; } catch { return false; }
  }, [refresh]);

  const addToCart = React.useCallback(async (product: { id: string; name: string }, quantity = 1, variant: Variant = {}) => {
    if (!userRef.current && !(guestOk.current && (await startGuest()))) {
      openAuth("login", { then: () => { void addToCartRef.current(product, quantity, variant); } });
      toast("Sign in to add items to your bag");
      return false;
    }
    try {
      const { cart } = await postJson<{ cart: CartLine[] }>("/api/cart", { productId: product.id, quantity, size: variant.size, color: variant.color });
      setState((s) => ({ ...s, cart }));
      toast.success("Added to bag", { description: `${product.name}${variant.size ? ` · ${variant.size}` : ""}`, action: { label: "View bag", onClick: () => router.push("/cart") } });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { void refresh(); openAuth("login"); return false; }
      toast.error("Could not add to cart", { description: e instanceof Error ? e.message : "Please try again." });
      return false;
    }
  }, [openAuth, refresh, router, startGuest]);
  const addToCartRef = React.useRef(addToCart);
  addToCartRef.current = addToCart;

  const mutateCart = React.useCallback(async (fn: () => Promise<{ cart: CartLine[] }>, errorTitle: string) => {
    try {
      const { cart } = await fn();
      setState((s) => ({ ...s, cart }));
    } catch (e) {
      toast.error(errorTitle, { description: e instanceof Error ? e.message : "Please try again." });
      void refresh();
    }
  }, [refresh]);

  const setQuantity = React.useCallback((line: LineRef, quantity: number) =>
    mutateCart(() => postJson(`/api/cart/${line.productId}`, { quantity, size: line.size, color: line.color }, "PATCH"), "Could not update quantity"), [mutateCart]);

  const removeFromCart = React.useCallback((line: LineRef) =>
    mutateCart(() => postJson(`/api/cart/${line.productId}`, { size: line.size, color: line.color }, "DELETE"), "Could not remove item"), [mutateCart]);

  const toggleWishlist = React.useCallback(async (arg: string | { id: string; name: string }) => {
    const product = typeof arg === "string" ? { id: arg, name: "" } : arg;
    if (!userRef.current) { openAuth("login", { then: () => { void toggleRef.current(product); } }); toast("Sign in to save items to your wishlist"); return; }
    const has = wishlistRef.current.includes(product.id);
    setState((s) => ({ ...s, wishlist: has ? s.wishlist.filter((x) => x !== product.id) : [...s.wishlist, product.id] })); // optimistic
    try {
      if (has) await postJson(`/api/wishlist/${product.id}`, {}, "DELETE");
      else await postJson("/api/wishlist", { productId: product.id });
      toast.success(has ? "Removed from wishlist" : "Saved to wishlist", product.name ? { description: product.name } : undefined);
    } catch (e) {
      setState((s) => ({ ...s, wishlist: has ? [...s.wishlist, product.id] : s.wishlist.filter((x) => x !== product.id) }));
      toast.error("Could not update wishlist", { description: e instanceof Error ? e.message : "Please try again." });
    }
  }, [openAuth]);
  const toggleRef = React.useRef(toggleWishlist);
  toggleRef.current = toggleWishlist;

  const logout = React.useCallback(async () => {
    try { await postJson("/api/auth/logout", {}); } catch {}
    setState({ user: null, ready: true, cart: [], wishlist: [], address: null });
    toast("Signed out");
    router.push("/");
    router.refresh();
  }, [router]);

  const onAuthed = React.useCallback(async () => {
    await refresh();
    const { next, then } = pending.current;
    pending.current = {};
    setModal(null);
    if (then) await then();
    if (next) router.push(next);
    else router.refresh();
  }, [refresh, router]);

  const value = React.useMemo<Ctx>(() => ({
    ...state,
    cartCount: state.cart.reduce((n, l) => n + l.quantity, 0),
    openAuth, addToCart, setQuantity, removeFromCart, toggleWishlist, refresh, logout,
  }), [state, openAuth, addToCart, setQuantity, removeFromCart, toggleWishlist, refresh, logout]);

  return (
    <CustomerContext.Provider value={value}>
      {children}
      <CustomerAuthModal
        open={modal !== null}
        initialMode={modal?.mode ?? "login"}
        resetToken={modal?.token}
        resetEmail={modal?.email}
        onClose={() => { pending.current = {}; setModal(null); }}
        onAuthed={onAuthed}
      />
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  const ctx = React.useContext(CustomerContext);
  if (!ctx) throw new Error("useCustomer must be used inside CustomerProvider");
  return ctx;
}
