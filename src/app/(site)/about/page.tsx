import Link from "next/link";
import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { ProductArt } from "@/components/site/product-art";
import { UspCards } from "@/components/site/home-sections";
import { Button } from "@/components/ui/button";
import { about, site } from "@/lib/site";

export const metadata: Metadata = { title: "About us", description: site.description };

export default function AboutPage() {
  return (
    <>
      <PageHero title={about.title} description={site.tagline} crumbs={[{ label: "About" }]} />
      <section className="container-x grid items-center gap-10 py-12 lg:grid-cols-[1fr_1.2fr] lg:py-16">
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-t-[999px] rounded-b-3xl shadow-lift"><ProductArt kind="cloth" tone="silver" hue={340} view={0} className="aspect-[3/4]" /></div>
        <div className="space-y-4 text-lg leading-relaxed">{about.paragraphs.map((t) => <p key={t}>{t}</p>)}
          <Button asChild size="lg" className="mt-4 rounded-full"><Link href="/shop">Explore the collection</Link></Button></div>
      </section>
      <section className="container-x pb-16"><UspCards /></section>
    </>
  );
}
