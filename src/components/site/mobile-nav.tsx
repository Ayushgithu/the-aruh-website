"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/hooks/use-customer";

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/shop", label: "Shop", Icon: LayoutGrid },
  { href: "/wishlist", label: "Wishlist", Icon: Heart },
  { href: "/cart", label: "Bag", Icon: ShoppingBag },
  { href: "/account", label: "Account", Icon: User },
] as const;

/** App-style bottom bar for phones. Hidden on the product page (it has its own sticky Add-to-bag bar) and at checkout. */
export function MobileNav() {
  const pathname = usePathname();
  const { cartCount, wishlist } = useCustomer();
  if (pathname.startsWith("/product/") || pathname.startsWith("/checkout")) return null;
  const on = (h: string) => (h === "/" ? pathname === "/" : pathname.startsWith(h));
  return (
    <nav aria-label="Quick links" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden print:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, Icon }) => {
          const n = href === "/cart" ? cartCount : href === "/wishlist" ? wishlist.length : 0;
          return (
            <li key={href}>
              <Link href={href} aria-current={on(href) ? "page" : undefined} className={cn("relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", on(href) ? "text-primary" : "text-body")}>
                <span className="relative"><Icon className={cn("h-[22px] w-[22px]", on(href) && "fill-primary/10")} />{n > 0 && <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{n}</span>}</span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
