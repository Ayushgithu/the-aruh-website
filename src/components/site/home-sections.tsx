import Link from "next/link";
import { ArrowRight, Banknote, RefreshCcw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import type { Banner, Product } from "@/lib/types";
import { about, budgets, site, usps } from "@/lib/site";
import { InstagramIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { ProductArt, ProductVisual } from "./product-art";
import { ProductCard } from "./product-card";
import { Countdown } from "./sale-timer";

export function SectionTitle({ eyebrow, title, description, href, cta, center = true }: { eyebrow?: string; title: string; description?: string; href?: string; cta?: string; center?: boolean }) {
  return (
    <div className={cn("mb-8 flex flex-col gap-3 sm:mb-10", center ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between")}>
      <div className={center ? "mx-auto max-w-2xl" : ""}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="text-h2 mt-2">{title}</h2>
        {center && <div className="gold-rule mx-auto mt-4 w-24" aria-hidden />}
        {description && <p className="text-lead mt-3">{description}</p>}
      </div>
      {href && cta && <Link href={href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">{cta} <ArrowRight className="h-4 w-4" /></Link>}
    </div>
  );
}

/* ----------------------------------------------------------------- hero (used when no slides are uploaded) */
export function DefaultHero({ products }: { products: Product[] }) {
  const arch = (p: Product | undefined, i: number, cls: string) => (
    <Link href={p ? `/product/${p.slug}` : "/shop"} className={cn("group relative block overflow-hidden rounded-t-[999px] rounded-b-3xl bg-surface shadow-lift", cls)} aria-label={p ? p.name : "Shop all"}>
      {p ? <ProductVisual product={p} className="h-full !aspect-auto transition duration-700 group-hover:scale-105" /> : <ProductArt kind="cloth" tone="silver" hue={[340, 20, 280][i]} view={i} className="h-full" />}
      {p && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10 text-sm font-semibold text-white">{p.name}<span className="block text-xs font-normal opacity-90">{formatPrice(p.price)}</span></span>}
    </Link>
  );
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-faint via-surface to-gold-soft">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="container-x grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div>
          <p className="eyebrow flex items-center gap-2"><Sparkles className="h-4 w-4" /> New season edit</p>
          <h1 className="text-display mt-4">Dressed for every <em className="font-semibold not-italic text-primary">celebration</em></h1>
          <p className="text-lead mt-5 max-w-lg">{site.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-8"><Link href="/shop">Shop the collection</Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8"><Link href="/shop?sort=new">New arrivals</Link></Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {usps.slice(0, 3).map((u) => <li key={u.title} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />{u.title}</li>)}
          </ul>
        </div>
        <div className="grid grid-cols-[1fr_1.1fr] items-end gap-3 sm:gap-5">
          {arch(products[0], 0, "aspect-[3/4.2] translate-y-6")}
          {arch(products[1], 1, "aspect-[3/4.6]")}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- scrolling strip */
export function UspMarquee() {
  const row = [...usps.map((u) => `${u.title} · ${u.text}`), `${site.name} — ${site.tagline}`];
  const cell = (k: string) => row.map((t, i) => <span key={k + i} className="flex items-center gap-8 whitespace-nowrap">{t}<span className="text-[#e7c98a]" aria-hidden>✦</span></span>);
  return (
    <div className="overflow-hidden bg-primary py-3 text-sm font-medium text-white" aria-label="Highlights">
      <div className="flex w-max animate-marquee gap-8" style={{ ["--marquee-duration" as string]: "45s" }}>{cell("a")}{cell("b")}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- collections */
const fallbackCollections = ["Suit Sets", "Sarees", "Co-ord Sets", "Dresses"];
export function CollectionGrid({ collections }: { collections: { name: string; slug: string; count: number; image?: string }[] }) {
  const list = collections.length ? collections.slice(0, 8) : fallbackCollections.map((name) => ({ name, slug: "", count: 0, image: undefined as string | undefined }));
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {list.map((c, i) => (
        <li key={c.name}>
          <Link href={c.slug ? `/collections/${c.slug}` : "/shop"} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
            <div className="absolute inset-0 transition duration-700 group-hover:scale-105">
              {c.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ProductArt kind="cloth" tone="silver" hue={[340, 20, 280, 160, 40, 220][i % 6]} view={i} />}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
              <h3 className="font-serif text-xl !text-white sm:text-2xl">{c.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium opacity-90 sm:text-sm">{c.count > 0 ? `${c.count} style${c.count > 1 ? "s" : ""}` : "Explore"} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------------- shelf */
export function ProductShelf({ products }: { products: Product[] }) {
  if (!products.length) return <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm">New styles are on their way. Add products from your dashboard and they will appear here.</p>;
  return <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">{products.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}</ul>;
}

/* ----------------------------------------------------------------- deal banner */
export function DealBanner({ banner, timer }: { banner?: Banner; timer?: { title: string; subtitle: string; cta: string; href: string; endsAt: string } }) {
  const title = timer?.title ?? banner?.title ?? "Today’s big deals";
  const sub = timer?.subtitle ?? banner?.subtitle ?? "Festive favourites at up to 40% off — while stocks last.";
  const cta = timer?.cta ?? banner?.cta ?? "Shop the sale";
  const href = timer?.href ?? banner?.href ?? "/shop?sort=discount";
  return (
    <section className="container-x">
      <div className="relative grid overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#6f1633] to-[#3d0c1c] text-white md:grid-cols-[1.2fr_1fr]">
        <div className="relative z-10 p-8 sm:p-12 lg:p-16">
          <p className="eyebrow !text-[#e7c98a]">Limited time</p>
          <h2 className="mt-3 text-3xl !text-white sm:text-5xl">{title}</h2>
          <p className="mt-4 max-w-md text-white/85">{sub}</p>
          {timer && <Countdown endsAt={timer.endsAt} className="mt-5" />}
          <Button asChild size="lg" className="mt-7 rounded-full bg-white px-8 text-primary hover:bg-white/90"><Link href={href}>{cta}</Link></Button>
        </div>
        <div className="relative min-h-52 md:min-h-full">
          {banner?.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={banner.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden><span className="font-serif text-[9rem] font-semibold leading-none text-white/10 sm:text-[12rem]">%</span></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#3d0c1c]/60 to-transparent max-md:hidden" />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- lookbook (bento) */
export function Lookbook({ products }: { products: Product[] }) {
  const tiles = products.slice(0, 5);
  if (tiles.length < 3) return null;
  const span = ["col-span-2 row-span-2", "", "", "", "col-span-2 md:col-span-1"];
  return (
    <ul className="grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] md:grid-cols-4 md:gap-4">
      {tiles.map((p, i) => (
        <li key={p.id} className={cn("group relative overflow-hidden rounded-2xl", span[i])}>
          <Link href={`/product/${p.slug}`} className="block h-full">
            <ProductVisual product={p} className="h-full !aspect-auto transition duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 transition group-hover:opacity-100" />
            <span className="absolute inset-x-0 bottom-0 p-4 text-white"><span className="eyebrow !text-[#e7c98a]">Shop the look</span><span className="mt-1 block font-serif text-lg leading-tight">{p.name}</span></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------------- USP cards */
const uspIcons = [Truck, RefreshCcw, Banknote, ShieldCheck];
export function UspCards() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {usps.map((u, i) => {
        const Icon = uspIcons[i % uspIcons.length];
        return (
          <li key={u.title} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 shadow-card">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-faint text-primary"><Icon className="h-6 w-6" /></span>
            <span><span className="block font-semibold text-ink">{u.title}</span><span className="text-sm">{u.text}</span></span>
          </li>
        );
      })}
    </ul>
  );
}

/* ----------------------------------------------------------------- instagram */
export function InstagramGrid({ products }: { products: Product[] }) {
  const cells = Array.from({ length: 6 }, (_, i) => products[i]);
  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {cells.map((p, i) => (
          <li key={i}>
            <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Open Instagram" className="group relative block aspect-square overflow-hidden rounded-xl bg-surface">
              {p?.images?.[0] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.images[0]} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /> : <ProductArt kind="cloth" tone="silver" hue={[340, 20, 280, 160, 40, 220][i]} view={i} className="transition duration-500 group-hover:scale-110" />}
              <span className="absolute inset-0 flex items-center justify-center bg-primary/70 opacity-0 transition group-hover:opacity-100"><InstagramIcon className="h-7 w-7 text-white" /></span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ----------------------------------------------------------------- about teaser */
export function AboutTeaser() {
  return (
    <section className="container-x">
      <div className="grid items-center gap-8 rounded-3xl bg-gold-soft/60 p-8 sm:p-12 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
        <div className="mx-auto w-full max-w-xs overflow-hidden rounded-t-[999px] rounded-b-3xl shadow-lift"><ProductArt kind="cloth" tone="silver" hue={20} view={2} className="aspect-[3/4]" /></div>
        <div>
          <p className="eyebrow">About {site.name}</p>
          <h2 className="text-h2 mt-2">{about.title}</h2>
          <p className="mt-4 leading-relaxed">{about.paragraphs[0]}</p>
          <p className="mt-3 leading-relaxed">{about.paragraphs[1]}</p>
          <Button asChild variant="outline" className="mt-6 rounded-full"><Link href="/about">Read our story</Link></Button>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- shop by occasion / budget / colour */
export function ShopByStrip({ occasions, colors }: { occasions: { name: string; slug: string }[]; colors: { name: string; slug: string; hex?: string }[] }) {
  const pill = "inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium text-ink shadow-card transition hover:border-primary hover:text-primary";
  const row = (title: string, children: React.ReactNode) => <div><h3 className="mb-3 font-sans text-sm font-bold uppercase tracking-[0.16em] text-ink">{title}</h3><div className="flex flex-wrap gap-2.5">{children}</div></div>;
  return (
    <div className="grid gap-7 lg:grid-cols-3">
      {row("By budget", budgets.map((n) => <Link key={n} href={`/shop/budget/under-${n}`} className={pill}>Under {formatPrice(n)}</Link>))}
      {occasions.length > 0 && row("By occasion", occasions.slice(0, 6).map((o) => <Link key={o.slug} href={`/shop/occasion/${o.slug}`} className={pill}>{o.name}</Link>))}
      {colors.length > 0 && row("By colour", colors.slice(0, 8).map((c) => <Link key={c.slug} href={`/shop/colour/${c.slug}`} className={pill}><span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15" style={{ background: c.hex ?? "#d6cfc9" }} />{c.name}</Link>))}
    </div>
  );
}
