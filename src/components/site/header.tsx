"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, LogOut, Menu, Package, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { nav, site } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { LogoMark } from "@/components/ui/icons";
import { useCustomer } from "@/hooks/use-customer";
import { AccountMenu } from "./account-menu";
import { SearchDialog } from "./search-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label={`${site.name} home`} className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-10 w-12 shrink-0" />
      <span className="font-serif text-xl font-semibold tracking-wide text-ink sm:text-2xl">{site.name}</span>
    </Link>
  );
}

const iconBtn = "relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-primary-faint hover:text-primary";

export function Header({ collections = [] }: { collections?: { name: string; slug: string }[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const customer = useCustomer();

  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  React.useEffect(() => setMenu(false), [pathname]);
  React.useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
      if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const active = (href: string) => { const p = href.split("?")[0]; return p === "/" ? pathname === "/" : pathname.startsWith(p) && !href.includes("?"); };

  return (
    <>
      <header className={cn("sticky top-0 z-50 border-b transition-all duration-300 print:hidden", scrolled ? "border-line bg-card/90 shadow-sm backdrop-blur-xl" : "border-transparent bg-card")}>
        <div className="container-x flex h-16 items-center gap-3 lg:h-[4.5rem]">
          <button onClick={() => setMenu(true)} aria-label="Open menu" className={cn(iconBtn, "-ml-2 lg:hidden")}><Menu className="h-6 w-6" /></button>
          <Logo className="max-lg:mx-auto" />

          <nav aria-label="Main" className="mx-auto hidden items-center gap-1 lg:flex">
            {nav.filter((n) => n.href !== "/contact").map((n) => (
              <React.Fragment key={n.label}>
                <Link href={n.href} aria-current={active(n.href) ? "page" : undefined}
                  className={cn("rounded-full px-3.5 py-2 text-sm font-medium transition-colors", active(n.href) ? "text-primary" : "text-ink hover:text-primary")}>
                  {n.label}
                </Link>
                {n.label === "Shop All" && collections.length > 0 && (
                  <div className="group relative">
                    <button type="button" className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:text-primary group-hover:text-primary group-focus-within:text-primary">
                      Collections <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180" />
                    </button>
                    <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-3 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      <ul className="rounded-2xl border border-line bg-card p-2 shadow-lift">
                        {collections.map((c) => (
                          <li key={c.slug}><Link href={`/collections/${c.slug}`} className="block rounded-xl px-4 py-2.5 text-sm font-medium text-ink hover:bg-primary-faint hover:text-primary">{c.name}</Link></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-0.5 max-lg:ml-0">
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search" title="Search ( / )" className={iconBtn}><Search className="h-5 w-5" /></button>
            <ThemeToggle className={cn(iconBtn, "hidden sm:flex")} />
            <Link href="/wishlist" aria-label={`Wishlist, ${customer.wishlist.length} items`} className={cn(iconBtn, "hidden sm:flex")}>
              <Heart className="h-5 w-5" />
              {customer.wishlist.length > 0 && <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">{customer.wishlist.length}</span>}
            </Link>
            <div className="hidden lg:block"><AccountMenu /></div>
            <Link href="/cart" aria-label={`Bag, ${customer.cartCount} items`} className={iconBtn}>
              <ShoppingBag className="h-5 w-5" />
              {customer.cartCount > 0 && <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">{customer.cartCount}</span>}
            </Link>
          </div>
        </div>
      </header>

      {/* Outside <header>: its backdrop-blur would trap these fixed overlays inside the bar. */}
      <Drawer open={menu} onClose={() => setMenu(false)} title="Menu" side="left">
        <nav aria-label="Mobile" className="flex flex-col gap-0.5">
          {nav.map((n) => (
            <Link key={n.label} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("flex min-h-12 items-center rounded-xl px-4 font-serif text-lg", active(n.href) ? "bg-primary-faint text-primary" : "text-ink hover:bg-surface")}>{n.label}</Link>
          ))}
        </nav>
        {collections.length > 0 && (
          <div className="mt-5 border-t border-line pt-5">
            <p className="eyebrow px-4">Collections</p>
            <ul className="mt-2">{collections.map((c) => <li key={c.slug}><Link href={`/collections/${c.slug}`} className="flex min-h-11 items-center rounded-xl px-4 text-[15px] text-ink hover:bg-surface">{c.name}</Link></li>)}</ul>
          </div>
        )}
        <div className="mt-6 space-y-2 border-t border-line pt-6">
          {customer.user && !customer.user.guest ? (
            <>
              <p className="px-1 pb-1 text-sm font-semibold text-ink">Hi, {customer.user.name.split(" ")[0]}</p>
              <Button asChild variant="outline" size="lg" className="w-full justify-start"><Link href="/account/orders"><Package className="h-4 w-4" /> My orders</Link></Button>
              <Button asChild variant="outline" size="lg" className="w-full justify-start"><Link href="/wishlist"><Heart className="h-4 w-4" /> Wishlist</Link></Button>
              <Button asChild variant="outline" size="lg" className="w-full justify-start"><Link href="/account"><User className="h-4 w-4" /> Profile &amp; password</Link></Button>
              <Button variant="ghost" size="lg" className="w-full justify-start" onClick={() => { setMenu(false); void customer.logout(); }}><LogOut className="h-4 w-4" /> Sign out</Button>
            </>
          ) : (
            <Button size="lg" className="w-full" onClick={() => { setMenu(false); customer.openAuth("login"); }}><User className="h-4 w-4" /> Sign in / Create account</Button>
          )}
          <div className="flex justify-center pt-2"><ThemeToggle /></div>
        </div>
      </Drawer>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
