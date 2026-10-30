"use client";
import * as React from "react";
import Link from "next/link";
import { Heart, LogOut, Package, User } from "lucide-react";
import { useCustomer } from "@/hooks/use-customer";

export function AccountMenu() {
  const { user, ready, openAuth, logout, wishlist } = useCustomer();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);

  if (!user || user.guest) {
    return (
      <button type="button" onClick={() => openAuth("login")} aria-label="Sign in" disabled={!ready && false}
        className="flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-body transition hover:bg-primary-faint hover:text-primary">
        <User className="h-5 w-5" /> <span className="hidden xl:inline">Sign in</span>
      </button>
    );
  }

  const link = "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-ink hover:bg-surface";
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-ink transition hover:bg-primary-faint">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{user.name[0]?.toUpperCase()}</span>
        <span className="hidden max-w-[7rem] truncate xl:inline">{user.name.split(" ")[0]}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-card p-2 shadow-lift">
          <div className="border-b border-line px-3 pb-2 pt-1">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs">{user.email}</p>
          </div>
          <Link role="menuitem" href="/account/orders" onClick={() => setOpen(false)} className={link}><Package className="h-4 w-4" /> My orders</Link>
          <Link role="menuitem" href="/account/wishlist" onClick={() => setOpen(false)} className={link}><Heart className="h-4 w-4" /> Wishlist {wishlist.length > 0 && <span className="ml-auto text-xs">{wishlist.length}</span>}</Link>
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className={link}><User className="h-4 w-4" /> Profile &amp; password</Link>
          <button role="menuitem" onClick={() => { setOpen(false); void logout(); }} className={`${link} w-full text-left`}><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      )}
    </div>
  );
}
