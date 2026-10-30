import { Reveal } from "@/components/ui/reveal";
import { AboutTeaser, CollectionGrid, DealBanner, DefaultHero, InstagramGrid, Lookbook, ProductShelf, SectionTitle, ShopByStrip, UspCards, UspMarquee } from "@/components/site/home-sections";
import { TestimonialCarousel } from "@/components/site/carousels";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { getSlides } from "@/lib/repo-carousel";
import { getBanners, getCollections, getFacets, getFeatured, getFlashProducts, getNewest } from "@/lib/repo";
import { Countdown } from "@/components/site/sale-timer";
import { testimonials } from "@/lib/testimonials";
import { site } from "@/lib/site";
import { getRules } from "@/lib/settings";

export const dynamic = "force-dynamic"; // always show what the dashboard saved

const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback); // a hiccup in one section must not take the home page down

export default async function HomePage() {
  const rules = await getRules();
  const [slides, banners, collections, best, fresh, flash, facets] = await Promise.all([
    safe(getSlides(true), []), safe(getBanners(true), []), safe(getCollections(), []), safe(getFeatured("clothing", 8), []), safe(getNewest("clothing", 8), []),
    safe(getFlashProducts(8), []), safe(getFacets(), { occasions: [], colors: [] }),
  ]);
  const heroProducts = best.filter((p) => p.images?.length).concat(best.filter((p) => !p.images?.length)).slice(0, 2);
  const looks = [...fresh, ...best].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);

  return (
    <>
      {slides.length > 0 ? <HeroCarousel slides={slides} /> : <DefaultHero products={heroProducts} />}
      <UspMarquee />

      <section className="section container-x">
        <Reveal><SectionTitle eyebrow="Curated for you" title="Shop by collection" description="Find your style, from festive favourites to everyday easy." /></Reveal>
        <Reveal><CollectionGrid collections={collections} /></Reveal>
      </section>

      {flash.length > 0 && (
        <section className="section container-x !pt-0">
          <Reveal>
            <div className="rounded-3xl bg-gradient-to-br from-primary via-[#6f1633] to-[#3d0c1c] p-5 text-white sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div><p className="eyebrow !text-[#e7c98a]">⚡ Flash sale</p><h2 className="mt-1 text-2xl !text-white sm:text-3xl">Grab them before the timer ends</h2></div>
                <Countdown endsAt={flash[0].flash!.endsAt} />
              </div>
              <div className="rounded-2xl bg-card p-4 text-ink sm:p-6"><ProductShelf products={flash.slice(0, 4)} /></div>
            </div>
          </Reveal>
        </section>
      )}

      <section className="section container-x !pt-0">
        <Reveal><SectionTitle eyebrow="Loved by many" title="Best sellers" description="The pieces our customers keep coming back for." href="/shop" cta="View all" /></Reveal>
        <Reveal><ProductShelf products={best.slice(0, 8)} /></Reveal>
      </section>

      <section className="container-x pb-12 sm:pb-16"><Reveal><SectionTitle eyebrow="Find it faster" title="Shop by budget, occasion & colour" /></Reveal><Reveal><ShopByStrip occasions={facets.occasions} colors={facets.colors} /></Reveal></section>

      <Reveal><DealBanner banner={banners[0]} timer={rules.saleTimer.active && rules.saleTimer.endsAt && new Date(rules.saleTimer.endsAt) > new Date() ? rules.saleTimer : undefined} /></Reveal>

      <section className="section container-x">
        <Reveal><SectionTitle eyebrow="Just landed" title="New arrivals" description="Fresh styles, added this season." href="/shop?sort=new" cta="Shop new" /></Reveal>
        <Reveal><ProductShelf products={fresh.slice(0, 4)} /></Reveal>
      </section>

      {looks.length >= 3 && (
        <section className="container-x pb-12 sm:pb-20">
          <Reveal><SectionTitle eyebrow="Lookbook" title="Shop the look" description="Get inspired — tap any look to shop it." /></Reveal>
          <Reveal><Lookbook products={looks} /></Reveal>
        </section>
      )}

      <section className="container-x pb-12 sm:pb-20"><Reveal><UspCards /></Reveal></section>

      <section className="section bg-card">
        <div className="container-x">
          <Reveal><SectionTitle eyebrow="Happy customers" title="Rated 4.9 by our community" description={`Real words from people who wear ${site.name}.`} /></Reveal>
          <Reveal><TestimonialCarousel items={testimonials} /></Reveal>
        </div>
      </section>

      <section className="section"><Reveal><AboutTeaser /></Reveal></section>

      <section className="container-x pb-16">
        <Reveal><SectionTitle eyebrow="@ Instagram" title={`Follow ${site.instagramHandle}`} description="Tag us in your looks — we love to feature them." /></Reveal>
        <Reveal><InstagramGrid products={looks} /></Reveal>
      </section>
    </>
  );
}
