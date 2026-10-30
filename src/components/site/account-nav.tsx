"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, Package, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/account/orders", label: "My orders", Icon: Package },
  { href: "/account/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/account/addresses", label: "Saved addresses", Icon: MapPin },
  { href: "/account/wallet", label: "Wallet", Icon: Wallet },
  { href: "/account", label: "Profile & password", Icon: User },
];

export function AccountNav() {
  const path = usePathname();
  const active = (h: string) => (h === "/account" ? path === "/account" : path.startsWith(h));
  return (
    <nav aria-label="Account" className="no-scrollbar flex gap-2 overflow-x-auto lg:sticky lg:top-28 lg:flex-col lg:self-start lg:overflow-visible print:hidden">
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
          className={cn("flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-4 text-sm font-medium transition", active(href) ? "bg-primary text-white shadow-sm" : "border border-line bg-card text-body hover:border-primary/40 hover:text-primary")}>
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
    </nav>
  );
}
