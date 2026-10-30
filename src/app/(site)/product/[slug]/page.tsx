import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronDown, RefreshCcw, Shirt, Truck } from "lucide-react";
import { getProductBySlug, getSimilar } from "@/lib/repo";
import { ViewTracker } from "@/components/site/view-tracker";
import { discountPct, formatPrice } from "@/lib/utils";
import { Gallery } from "@/components/site/gallery";
import { PurchasePanel } from "@/components/site/purchase-panel";
import { ProductShelf, SectionTitle } from "@/components/site/home-sections";
import { RecentlyViewed } from "@/components/site/recently-viewed";
import { Breadcrumbs } from "@/components/site/page-hero";
import { site } from "@/lib/site";
import { collectionSlug } from "@/lib/repo";
import { VariantProvider } from "@/components/site/variant-context";
import { FlashBanner } from "@/components/site/flash-banner";
import { getRules } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  return { title: p.name, description: `${p.name} — ${p.description.slice(0, 140)}`, alternates: { canonical: `/product/${p.slug}` }, openGraph: { title: p.name, description: p.description.slice(0, 160), images: p.images?.[0] ? [p.images[0]] : undefined } };
}

function Accordion({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line py-1">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-serif text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">{title}<ChevronDown className="h-5 w-5 transition group-open:rotate-180" /></summary>
      <div className="pb-4 text-[15px] leading-relaxed">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const off = discountPct(p.price, p.mrp);
  const similar = await getSimilar(p, 4);
  const rules = await getRules();
  const canReturn = rules.returns.enabled && rules.returns.allowReturn && p.returnable !== false;
  const canExchange = rules.returns.enabled && rules.returns.allowExchange && p.exchangeable !== false;
  const policyLine = canReturn || canExchange ? [canReturn && `${rules.returns.returnDays}-day return`, canExchange && `${rules.returns.exchangeDays}-day exchange`].filter(Boolean).join(" & ") : "Final sale — not eligible for return or exchange";
  const isClothing = p.type === "clothing";
  const crumbs = isClothing
    ? [{ label: "Shop", href: "/shop" }, { label: p.category, href: `/collections/${collectionSlug(p.category)}` }, { label: p.name }]
    : [{ label: "Accessories", href: "/accessories" }, { label: p.name }];
  const facts = [["Fabric", p.fabric], ["Fit", p.fit], ["Occasion", p.occasion], ["Collection", p.category]].filter(([, v]) => v) as [string, string][];

  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const abs = (u: string) => (u.startsWith("/") ? `${base}${u}` : u);
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, category: p.category,
    image: (p.images ?? []).map(abs), sku: p.id, ...(p.fabric ? { material: p.fabric } : {}),
    offers: { "@type": "Offer", url: `${base}/product/${p.slug}`, priceCurrency: "INR", price: p.price, availability: p.stock === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <ViewTracker id={p.id} />
      <div className="container-x pt-5 sm:pt-7"><Breadcrumbs crumbs={crumbs} /></div>

      <VariantProvider product={p}>
      <div className="container-x grid gap-8 py-6 pb-28 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-10 lg:pb-10">
        <div className="lg:sticky lg:top-28 lg:self-start"><Gallery product={p} /></div>

        <div>
          <p className="eyebrow">{p.category}</p>
          <h1 className="mt-2 text-[clamp(1.7rem,1.2rem+2vw,2.6rem)]">{p.name}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-bold text-ink">{formatPrice(p.price)}</span>
            {p.mrp && p.mrp > p.price && <span className="text-lg text-slate-500 line-through">{formatPrice(p.mrp)}</span>}
            {off > 0 && <span className="rounded-full bg-primary-faint px-3 py-1 text-sm font-bold text-primary">{off}% OFF</span>}
          </div>
          {p.flash && <FlashBanner endsAt={p.flash.endsAt} />}
          <p className="mt-1 text-sm">Inclusive of all taxes. {p.price >= site.freeShippingAbove ? "Free delivery." : `Free delivery above ${formatPrice(site.freeShippingAbove)}.`}</p>
          {p.stock === "low" && p.stockCount && <p className="mt-3 text-sm font-semibold text-warning">Hurry — only {p.stockCount} left in total!</p>}

          <div className="mt-7"><PurchasePanel product={p} /></div>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            <li className="flex items-center gap-3 rounded-2xl bg-surface p-4 text-sm"><RefreshCcw className="h-5 w-5 shrink-0 text-primary" /><span className="font-medium text-ink">{policyLine}</span></li>
            <li className="flex items-center gap-3 rounded-2xl bg-surface p-4 text-sm"><Truck className="h-5 w-5 shrink-0 text-primary" /><span className="font-medium text-ink">Cash on delivery available</span></li>
          </ul>

          <div className="mt-8 border-t border-line">
            <Accordion title="Description" open><p>{p.description}</p>
              {p.highlights.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5">{p.highlights.map((h) => <li key={h}>{h}</li>)}</ul>}</Accordion>
            {(facts.length > 0 || p.washCare || Object.keys(p.specs).length > 0) && (
              <Accordion title="Fabric & care">
                {facts.length > 0 && <dl className="grid grid-cols-[7rem_1fr] gap-y-2">{facts.map(([k, v]) => <div key={k} className="contents"><dt className="font-medium text-ink">{k}</dt><dd>{v}</dd></div>)}</dl>}
                {Object.entries(p.specs).map(([k, v]) => <p key={k} className="mt-2"><span className="font-medium text-ink">{k}:</span> {v}</p>)}
                {p.washCare && <p className="mt-3 flex items-start gap-2"><Shirt className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {p.washCare}</p>}
              </Accordion>
            )}
            <Accordion title="Delivery, returns & exchange"><p>Orders ship in 1–2 working days. {canReturn || canExchange ? `You can request ${[canReturn && "a return", canExchange && "an exchange"].filter(Boolean).join(" or ")} within ${Math.max(canReturn ? rules.returns.returnDays : 0, canExchange ? rules.returns.exchangeDays : 0)} days of delivery. ${rules.returns.note}` : "This item cannot be returned or exchanged."} See our <Link href="/policies/returns" className="font-semibold text-primary hover:underline">returns policy</Link>.</p></Accordion>
          </div>
        </div>
      </div>
      </VariantProvider>

      {similar.length > 0 && (
        <section className="container-x pb-14">
          <SectionTitle eyebrow="You may also like" title="Similar styles" center={false} href={isClothing ? "/shop" : "/accessories"} cta="View all" />
          <ProductShelf products={similar} />
        </section>
      )}
      <RecentlyViewed current={p} />
    </>
  );
}
